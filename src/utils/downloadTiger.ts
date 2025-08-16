import * as vscode from "vscode";
import { log, revealLog } from "../logger";
import * as os from "os";
import fs from "fs";
import path from "path";
import { downloadFile } from "./downloadFile";
import { exec, ExecOptions } from "child_process";
import { Octokit } from "@octokit/core";

/**
 * Download the latest version of ck3-tiger from GitHub.
 * @returns {Promise<string | undefined>} The path to the downloaded executable, or undefined if download failed.
 */
export async function downloadTiger(): Promise<string | undefined> {
    revealLog();
    const platform = os.platform();

    try {
        const latestRelease = await fetchLatestRelease();
        if (!latestRelease) {
            return undefined;
        }

        const downloadUrl = findPlatformAsset(latestRelease.assets, platform);
        if (!downloadUrl) {
            vscode.window.showErrorMessage("No ck3-tiger binary found for your platform");
            return undefined;
        }

        const tigerPath = await ensureTigerPath();

        const data = await downloadAndExtractTiger(downloadUrl, platform, tigerPath);

        return data;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error downloading tiger: ${errorMessage}`);
        vscode.window.showErrorMessage(`Failed to download ck3-tiger: ${errorMessage}`);
        return undefined;
    }
}

/**
 * Fetch the latest release information from GitHub.
 * @returns {Promise<any | undefined>} The latest release data or undefined if fetching failed.
 */
async function fetchLatestRelease(): Promise<any | undefined> {
    try {
        const octokit = new Octokit();
        const response = await octokit.request("GET /repos/{owner}/{repo}/releases/latest", {
            owner: "amtep",
            repo: "tiger", // amtep renamed "ck3-tiger" to "tiger" :(
            headers: {
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });
        return response.data;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error fetching latest release: ${errorMessage}`);
        vscode.window.showErrorMessage(`Failed to fetch latest ck3-tiger release: ${errorMessage}`);
        return undefined;
    }
}

/**
 * Find the appropriate asset for the current platform.
 * @param {any[]} assets - The list of release assets.
 * @param {NodeJS.Platform} platform - The current platform.
 * @returns {Object | undefined} Object containing download URL or undefined if not found.
 */
export function findPlatformAsset(assets: any[], platform: NodeJS.Platform): string | undefined {
    log("Latest release assets:");
    log(JSON.stringify(assets.filter(asset => asset.name.includes("ck3")), null, 4));

    const platformName = platform === "win32" ? "windows" : "linux";
    const currentAsset = assets.find((asset) => asset.name.includes("ck3") && asset.name.includes(platformName));

    if (!currentAsset) {
        return undefined;
    }

    return currentAsset.browser_download_url;
}

async function ensureTigerPath(): Promise<string> {
    const context = await vscode.commands.executeCommand("getContext") as vscode.ExtensionContext;

    // Ensure the global storage directory exists
    const globalStoragePath = context.globalStorageUri.fsPath;
    if (!fs.existsSync(globalStoragePath)) {
        fs.mkdirSync(globalStoragePath, { recursive: true });
    }
    
    const tigerPath = path.join(globalStoragePath, "ck3-tiger");
    if (!fs.existsSync(tigerPath)) {
        fs.mkdirSync(tigerPath, { recursive: true });
        log(`Created directory: ${tigerPath}`);
    }

    return tigerPath;
}

/**
 * Download and extract the tiger binary.
 * @param {string} downloadUrl - The URL to download from.
 * @param {NodeJS.Platform} platform - The current platform.
 * @returns {Promise<string | undefined>} The path to the extracted executable.
 */
export async function downloadAndExtractTiger(
    downloadUrl: string,
    platform: NodeJS.Platform,
    tigerPath: string,
): Promise<string | undefined> {
    log("Downloading ck3-tiger release from:", downloadUrl);
    log("Downloading to:", tigerPath);

    try {
        const fileExtension = path.extname(downloadUrl);
        const fileName = fileExtension === ".zip" ? "tiger.zip" : "tiger.tar.gz";
        const archivePath = path.join(tigerPath, fileName);

        await downloadFile(downloadUrl, archivePath);
        log(`File downloaded as ${fileName}.`);

        await platformSpecificExtractArchive(archivePath, tigerPath, platform).then(() => {
            log("File extracted successfully.");
        }).catch((err) => {
            log("Error extracting file:", err);
        }).finally(() => {
            return fs.promises.unlink(archivePath).then(() => {
                log("Archive file deleted successfully.");
            });
        });

        const executableFile = platform === "win32" ? "ck3-tiger.exe" : "ck3-tiger";

        return path.join(tigerPath, executableFile);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error during download and extraction: ${errorMessage}`);
        return undefined;
    }
}

async function platformSpecificExtractArchive(archivePath: string, destDir: string, platform: NodeJS.Platform): Promise<{
    stdout: string;
    stderr: string;
}> {
    switch (platform) {
        case "win32":
            return execAsync(`tar -xf "${archivePath}" -C "${destDir}"`, { shell: "powershell.exe" });
        case "linux":
            return execAsync(`tar -xzf "${archivePath}" -C "${destDir}"`);
        default:
            throw new Error("Unsupported platform for extraction");
    }
}

export function execAsync(command: string, options?: ExecOptions): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        exec(command, options, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
            }
        });
    });
}