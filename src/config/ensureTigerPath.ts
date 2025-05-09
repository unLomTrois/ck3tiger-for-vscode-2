import * as vscode from "vscode";
import { log, revealLog } from "../logger";
import * as os from "os";
import path from "path";
import { ContextContainer } from "../context";
import fs from "fs";
import { downloadAndExtract } from "../utils/downloadFile";

/**
 * Ensure that the CK3-Tiger path is properly configured.
 * @param {vscode.WorkspaceConfiguration} config - The workspace configuration object.
 * @returns {Promise<void>}
 */
export async function ensureTigerPath(
    config: vscode.WorkspaceConfiguration
): Promise<void> {
    const tigerPath = config.get<string>("tigerPath");

    if (tigerPath) {
        return;
    }

    const newPath = await promptForTigerPath();

    if (newPath) {
        await updateTigerPath(config, newPath);
    } else {
        vscode.window.showErrorMessage(
            "ck3tiger.tigerPath not found. Please manually set the ck3path in the extension settings or try again."
        );
    }
}

/**
 * Prompt the user to set the tiger path.
 * @returns {Promise<string | undefined>} The selected tiger path, or undefined if the user cancels.
 */
async function promptForTigerPath(): Promise<string | undefined> {
    const userChoice = await vscode.window.showInformationMessage(
        "🐯 How do you want to setup ck3-tiger? (If you don't know, click 'Download it for me')",
        "Download it for me",
        "Set up the path to ck3-tiger executable manually"
    );

    if (userChoice === "Download it for me") {
        vscode.window.showInformationMessage(
            "🐯 Downloading ck3-tiger for you. Please wait..."
        );

        const downloadedPath = await downloadTiger();

        if (downloadedPath) {
            return downloadedPath;
        }
    }

    const manualSelection = await vscode.window.showInformationMessage(
        "🐯 Let's find your ck3tiger binary!",
        "Open",
        "Cancel"
    );

    if (manualSelection === "Open") {
        return await selectCK3TigerPath();
    }

    return undefined;
}

/**
 * Download the latest version of ck3-tiger from GitHub.
 * @returns {Promise<string | undefined>} The path to the downloaded executable, or undefined if download failed.
 */
async function downloadTiger(): Promise<string | undefined> {
    try {
        const { Octokit } = await import("@octokit/core");
        const octokit = new Octokit();
        const platform = os.platform();
        const supportedPlatforms: NodeJS.Platform[] = ["win32", "linux"];

        if (!supportedPlatforms.includes(platform)) {
            vscode.window.showErrorMessage(`Unsupported platform: ${platform}`);
            return undefined;
        }

        const latestRelease = await fetchLatestRelease(octokit);
        if (!latestRelease) {
            return undefined;
        }

        const assetInfo = findPlatformAsset(latestRelease.assets, platform);
        if (!assetInfo) {
            vscode.window.showErrorMessage("No ck3-tiger binary found for your platform");
            return undefined;
        }

        const { downloadUrl } = assetInfo;
        return await downloadAndExtractTiger(downloadUrl, platform);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error downloading tiger: ${errorMessage}`);
        vscode.window.showErrorMessage(`Failed to download ck3-tiger: ${errorMessage}`);
        return undefined;
    }
}

/**
 * Fetch the latest release information from GitHub.
 * @param {any} octokit - The Octokit instance.
 * @returns {Promise<any | undefined>} The latest release data or undefined if fetching failed.
 */
async function fetchLatestRelease(octokit: any): Promise<any | undefined> {
    try {
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
function findPlatformAsset(assets: any[], platform: NodeJS.Platform): { downloadUrl: string } | undefined {
    revealLog();
    log("Latest release assets:");
    log(JSON.stringify(assets.filter(asset => asset.name.includes("ck3")), null, 4));

    const platformName = platform === "win32" ? "windows" : "linux";
    const currentAsset = assets.find((asset) => 
        asset.name.includes("ck3") && asset.name.includes(platformName)
    );
    
    if (!currentAsset) {
        return undefined;
    }

    return { downloadUrl: currentAsset.browser_download_url };
}

/**
 * Download and extract the tiger binary.
 * @param {string} downloadUrl - The URL to download from.
 * @param {NodeJS.Platform} platform - The current platform.
 * @returns {Promise<string | undefined>} The path to the extracted executable.
 */
async function downloadAndExtractTiger(downloadUrl: string, platform: NodeJS.Platform): Promise<string | undefined> {
    const context = ContextContainer.context;
    const tigerPath = path.join(context.globalStorageUri.fsPath, "ck3-tiger");

    // Ensure the global storage directory exists
    if (!fs.existsSync(context.globalStorageUri.fsPath)) {
        fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
    }

    log("Downloading ck3-tiger release from:", downloadUrl);
    log("Downloading to:", tigerPath);

    try {
        await downloadAndExtract(downloadUrl, tigerPath);
        log("Download and extraction completed successfully.");

        const executableFile = platform === "win32" ? "ck3-tiger.exe" : "ck3-tiger";
        return path.join(tigerPath, executableFile);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error during download and extraction: ${errorMessage}`);
        return undefined;
    }
}

/**
 * Open a dialog for selecting the ck3tiger binary.
 * @returns {Promise<string | undefined>} The selected file path, or undefined if none is selected.
 */
async function selectCK3TigerPath(): Promise<string | undefined> {
    const fileUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
            Binaries: ["bin", "exe", "bat", "sh", "cmd"],
        },
        title: "Select ck3tiger binary",
        openLabel: "Select ck3tiger binary",
    });

    const selectedPath = fileUri?.[0]?.fsPath;
    log("ck3path selected:", selectedPath);

    return selectedPath;
}

/**
 * Update the path in the configuration.
 * @param {vscode.WorkspaceConfiguration} config - The workspace configuration object.
 * @param {string} tigerPath - The new path to set.
 * @returns {Promise<void>}
 */
async function updateTigerPath(
    config: vscode.WorkspaceConfiguration,
    tigerPath: string
): Promise<void> {
    try {
        log(`ck3tiger.tigerPath was set to ${tigerPath}`);
        await config.update(
            "tigerPath",
            tigerPath,
            vscode.ConfigurationTarget.Global
        );
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Failed to update ck3tiger.tigerPath: ${errorMessage}`);
        vscode.window.showErrorMessage(
            "Failed to update ck3tiger.tigerPath. Please manually set the ck3path in the extension settings or try again."
        );
    }
}
