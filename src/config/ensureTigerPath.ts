import * as vscode from "vscode";
import { log } from "../logger";
import { downloadTiger } from "../tiger/download";
import * as fs from "fs";
import * as path from "path";

/**
 * Ensure that the CK3-Tiger path is properly configured.
 * @param {vscode.WorkspaceConfiguration} config - The workspace configuration object.
 * @returns {Promise<void>}
 */
export async function ensureTigerPath(
    config: vscode.WorkspaceConfiguration,
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

export async function ensureTigerDir(): Promise<string> {
    const context = (await vscode.commands.executeCommand(
        "getContext"
    )) as vscode.ExtensionContext;

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
