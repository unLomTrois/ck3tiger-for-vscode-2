import * as vscode from "vscode";
import { log } from "./logger";

/**
 * Ensure that the CK3-Tiger path is properly configured.
 * @param {vscode.WorkspaceConfiguration} config - The workspace configuration object.
 */
export async function ensureTigerPath(
    config: vscode.WorkspaceConfiguration
): Promise<void> {
    const tigerPath = config.get<string>("ck3tiger.tigerPath");

    if (tigerPath) {
        return;
    }

    const newPath = await promptForTigerPath();

    if (newPath) {
        updateTigerPath(config, newPath);
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
    const userSelection = await vscode.window.showInformationMessage(
        "🐯 Let's find ck3path",
        "Open",
        "Cancel"
    );

    if (userSelection === "Open") {
        return await selectC3TigerPath();
    }

    return undefined;
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
            "ck3tiger.tigerPath",
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
