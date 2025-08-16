import * as vscode from "vscode";
import { log, revealLog } from "../logger";
import * as os from "os";
import fs from "fs";
import path from "path";
import { downloadFile } from "../utils/downloadFile";
import { execAsync } from "../utils/exec";
import { ensureTigerDir } from "../config/ensureTigerPath";

/**
 * Download the latest version of ck3-tiger from GitHub.
 * @returns {Promise<string | undefined>} The path to the downloaded executable, or undefined if download failed.
 */
export async function downloadTiger(): Promise<string | undefined> {
    revealLog();
    const platform = os.platform();
    let archivePath: string | undefined;

    try {
        const latestRelease = await fetchLatestRelease();
        if (!latestRelease) {
            return undefined;
        }

        const downloadUrl = findPlatformAsset(latestRelease.assets, platform);
        if (!downloadUrl) {
            vscode.window.showErrorMessage(
                "No ck3-tiger binary found for your platform"
            );
            return undefined;
        }

        const tigerPath = await ensureTigerDir();
        const fileExtension = path.extname(downloadUrl);
        const fileName =
            fileExtension === ".zip" ? "tiger.zip" : "tiger.tar.gz";
        archivePath = path.join(tigerPath, fileName);

        await downloadFile(downloadUrl, archivePath).then(() => {
            log(`File downloaded as ${fileName}.`);
        });

        await platformSpecificExtractArchive(
            archivePath,
            tigerPath,
            platform
        ).then(() => {
            log("File extracted successfully.");
        });

        const executableFile =
            platform === "win32" ? "ck3-tiger.exe" : "ck3-tiger";
        const executablePath = path.join(tigerPath, executableFile);

        return executablePath;
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        log(`Error downloading tiger: ${errorMessage}`);
        vscode.window.showErrorMessage(
            `Failed to download ck3-tiger: ${errorMessage}`
        );
        return undefined;
    } finally {
        if (archivePath && fs.existsSync(archivePath)) {
            await fs.promises.unlink(archivePath);
            log("Archive file deleted successfully.");
        }
    }
}

/**
 * Fetch the latest release information from GitHub.
 * @returns {Promise<any | undefined>} The latest release data or undefined if fetching failed.
 */
async function fetchLatestRelease(): Promise<any | undefined> {
    const { Octokit } = await import("@octokit/core");

    try {
        const octokit = new Octokit();
        const response = await octokit.request(
            "GET /repos/{owner}/{repo}/releases/latest",
            {
                owner: "amtep",
                repo: "tiger", // amtep renamed "ck3-tiger" to "tiger" :(
                headers: {
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            }
        );
        return response.data;
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        log(`Error fetching latest release: ${errorMessage}`);
        vscode.window.showErrorMessage(
            `Failed to fetch latest ck3-tiger release: ${errorMessage}`
        );
        return undefined;
    }
}

/**
 * Find the appropriate asset for the current platform.
 * @param {any[]} assets - The list of release assets.
 * @param {NodeJS.Platform} platform - The current platform.
 * @returns {Object | undefined} Object containing download URL or undefined if not found.
 */
export function findPlatformAsset(
    assets: any[],
    platform: NodeJS.Platform
): string | undefined {
    log("Latest release assets:");
    log(
        JSON.stringify(
            assets.filter((asset) => asset.name.includes("ck3")),
            null,
            4
        )
    );

    const platformName = platform === "win32" ? "windows" : "linux";
    const currentAsset = assets.find(
        (asset) =>
            asset.name.includes("ck3") && asset.name.includes(platformName)
    );

    if (!currentAsset) {
        return undefined;
    }

    return currentAsset.browser_download_url;
}

async function platformSpecificExtractArchive(
    archivePath: string,
    destDir: string,
    platform: NodeJS.Platform
): Promise<{
    stdout: string;
    stderr: string;
}> {
    switch (platform) {
        case "win32":
            return execAsync(`tar -xf "${archivePath}" -C "${destDir}"`, {
                shell: "powershell.exe",
            });
        case "linux":
            return execAsync(`tar -xzf "${archivePath}" -C "${destDir}"`);
        default:
            throw new Error("Unsupported platform for extraction");
    }
}