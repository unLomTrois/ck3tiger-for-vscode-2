import * as vscode from "vscode";
import { log } from "../logger";

/**
 * Ensure that the CK3 path is properly configured.
 * @param {vscode.WorkspaceConfiguration} config - The workspace configuration object.
 */
export async function ensureCK3Path(config: vscode.WorkspaceConfiguration) {
    const ck3path = config.get<string>("ck3Path");

    if (ck3path) {
        return;
    }

    const newPath = await promptForCK3Path();

    if (newPath) {
        await updateCK3Path(config, newPath);
    } else {
        vscode.window.showErrorMessage(
            "ck3path not found. Please manually set the ck3path in the extension settings or try again."
        );
    }
}

/**
 * Prompt the user to set the CK3 path.
 * @returns {Promise<string | undefined>} The selected CK3 path, or undefined if the user cancels.
 */
async function promptForCK3Path(): Promise<string | undefined> {
    const userSelection = await getUserSelection();

    if (userSelection === "Open") {
        return await selectCK3Path();
    }

    return undefined;
}

/**
 * Show an information message to the user offering options to set the CK3 path.
 * @returns {Promise<string | undefined>} The user's selection, or undefined if canceled.
 */
async function getUserSelection(): Promise<string | undefined> {
    return await vscode.window.showInformationMessage(
        "🐯 Let's find ck3path",
        "Open",
        "Cancel"
    );
}

/**
 * Open a dialog for selecting the CK3 folder path.
 * @returns {Promise<string | undefined>} The selected folder path, or undefined if none is selected.
 */
async function selectCK3Path(): Promise<string | undefined> {
    const folderUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: "Select vanilla ck3 folder",
        openLabel: "Select CK3/game Folder",
    });

    return getSelectedPath(folderUri);
}

/**
 * Get the selected folder path from the URI array.
 * @param {vscode.Uri[] | undefined} folderUri - The URI array from the folder selection dialog.
 * @returns {string | undefined} The selected folder path, or undefined if none is selected.
 */
function getSelectedPath(
    folderUri: vscode.Uri[] | undefined
): string | undefined {
    const ck3path = folderUri?.[0]?.fsPath;
    if (ck3path) {
        log("ck3path selected: " + ck3path);
    }
    return ck3path;
}

/**
 * Update the CK3 path in the configuration.
 * @param {vscode.WorkspaceConfiguration} config - The workspace configuration object.
 * @param {string} ck3path - The CK3 path to update in the configuration.
 */
async function updateCK3Path(config: vscode.WorkspaceConfiguration, ck3path: string) {
    log(`ck3path set to ${ck3path}`);
    try {
        await config.update("ck3Path", ck3path, vscode.ConfigurationTarget.Global);
    } catch (error: any) {
        log(`Failed to update ck3path: ${error.message || error}`);
        vscode.window.showErrorMessage(
            "Failed to update ck3path. Please check your permissions and try again."
        );
    }
}