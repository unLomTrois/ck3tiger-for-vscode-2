import * as vscode from "vscode";
import { log, revealLog } from "../logger";
import * as os from "os";
import path from "path";
import { ContextContainer } from "../context";
import https from "https";
import url from "url";
import fs from "fs";
import { downloadAndExtract } from "../utils/downloadFile";

/**
 * Ensure that the CK3-Tiger path is properly configured.
 * @param {vscode.WorkspaceConfiguration} config - The workspace configuration object.
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
    const userSelection2 = await vscode.window.showInformationMessage(
        "🐯 How do you want to setup ck3-tiger? (If you don't know, click 'Download it for me')",
        "Download it for me",
        "Set up the path to ck3-tiger executable manually"
    );

    if (userSelection2 === "Download it for me") {
        vscode.window.showInformationMessage(
            "🐯 Downloading ck3-tiger for you. Please wait..."
        );

        const new_path = await downloadTiger();

        if (new_path) {
            return new_path;
        }
    }

    const userSelection = await vscode.window.showInformationMessage(
        "🐯 Let's find your ck3tiger binary!",
        "Open",
        "Cancel"
    );

    if (userSelection === "Open") {
        return await selectC3TigerPath();
    }

    return undefined;
}

async function downloadTiger(): Promise<string | undefined> {
    const { Octokit } = await import("@octokit/core");

    const octokit = new Octokit();

    const platform = os.platform();
    const supportedPlatforms: NodeJS.Platform[] = ["win32", "linux"];

    if (!supportedPlatforms.includes(platform)) {
        vscode.window.showErrorMessage(`Unsupported platform: ${platform}`);
        return;
    }

    const latestRelease = await octokit
        .request("GET /repos/{owner}/{repo}/releases/latest", {
            owner: "amtep",
            repo: "ck3-tiger",
            headers: {
                "X-GitHub-Api-Version": "2022-11-28",
            },
        })
        .then((res) => res.data);

    const { assets } = latestRelease;
    const ck3Assets = assets.filter((asset) => asset.name.includes("ck3"));

    revealLog();
    log("latest release:");
    log(JSON.stringify(ck3Assets, null, 4));

    const platformName = platform === "win32" ? "windows" : "linux";
    const currentAsset = ck3Assets.find((asset) =>
        asset.name.includes(platformName)
    );
    if (!currentAsset) {
        vscode.window.showErrorMessage("No ck3-tiger binary found");
        return;
    }

    const { browser_download_url } = currentAsset;
    const assetArchiveName = currentAsset.name;

    log("You need to download ck3-tiger binary from: ", browser_download_url);

    const context = ContextContainer.context;

    // Define the path where the server executable will be stored using globalStorageUri
    const tigerPath = path.join(context.globalStorageUri.fsPath, "ck3-tiger");

    // Ensure the global storage directory exists
    if (!fs.existsSync(context.globalStorageUri.fsPath)) {
        fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
    }

    // download
    log("downloading ck3-tiger release archive from: ", browser_download_url);
    log("downloading ck3-tiger release archive to: ", tigerPath);

    try {
        await downloadAndExtract(browser_download_url, tigerPath);
        log("All operations completed successfully.");

        const executableFile =
            platform === "win32" ? "ck3-tiger.exe" : "ck3-tiger";
        return path.join(tigerPath, executableFile);
    } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
    }
    // set path, return path

    return;
}

/**
 * Open a dialog for selecting the ck3tiger binary.
 * @returns {Promise<string | undefined>} The selected file path, or undefined if none is selected.
 */
async function selectC3TigerPath(): Promise<string | undefined> {
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

    const path = fileUri?.[0]?.fsPath;
    log("ck3path selected: ", path);

    return path;
}

/**
 * Update the path in the configuration.
 * @param {vscode.WorkspaceConfiguration} config - The workspace configuration object.
 * @param {string} path - The new path to set.
 */
async function updateTigerPath(
    config: vscode.WorkspaceConfiguration,
    path: string
) {
    try {
        log(`ck3tiger.tigerPath was set to ${path}`);
        await config.update(
            "tigerPath",
            path,
            vscode.ConfigurationTarget.Global
        );
    } catch (error: any) {
        log(`Failed to update ck3tiger.tigerPath: ${error.message || error}`);
        vscode.window.showErrorMessage(
            "Failed to update ck3tiger.tigerPath. Please manually set the ck3path in the extension settings or try again."
        );
    }
}
