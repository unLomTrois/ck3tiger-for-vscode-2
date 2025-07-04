import * as vscode from "vscode";
import { log } from "../logger";

/**
 * Ensure that the game path is properly configured.
 * @param {vscode.WorkspaceConfiguration} config - The workspace configuration object.
 */
export async function ensureGamePath(config: vscode.WorkspaceConfiguration) {
    const path = config.get<string>("gamePath");

    if (path) {
        return;
    }

    const newPath = await promptForGamePath();

    if (newPath) {
        await updateGamePath(config, newPath);
    } else {
        vscode.window.showErrorMessage(
            "Game path not found. Please manually set the game path in the extension settings or try again."
        );
    }
}

/**
 * Prompt the user to set the game path.
 * @returns {Promise<string | undefined>} The selected game path, or undefined if the user cancels.
 */
async function promptForGamePath(): Promise<string | undefined> {
    const userSelection = await getUserSelection();

    if (userSelection === "Open") {
        return await selectGamePath();
    }

    return undefined;
}

/**
 * Show an information message to the user offering options to set the game path.
 * @returns {Promise<string | undefined>} The user's selection, or undefined if canceled.
 */
async function getUserSelection(): Promise<string | undefined> {
    return await vscode.window.showInformationMessage(
        "🐯 Let's find the game's path",
        "Open",
        "Cancel"
    );
}

/**
 * Open a dialog for selecting the game folder path.
 * @returns {Promise<string | undefined>} The selected folder path, or undefined if none is selected.
 */
async function selectGamePath(): Promise<string | undefined> {
    const folderUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: "Select vanilla game folder",
        openLabel: "Select CK3/Vic3/Imperator '/game' Folder",
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
    const path = folderUri?.[0]?.fsPath;
    if (path) {
        log("path selected: " + path);
    }
    return path;
}

/**
 * Update the game path in the configuration.
 * @param {vscode.WorkspaceConfiguration} config - The workspace configuration object.
 * @param {string} path - The game path to update in the configuration.
 */
async function updateGamePath(config: vscode.WorkspaceConfiguration, path: string) {
    log(`game path set to ${path}`);
    try {
        await config.update("gamePath", path, vscode.ConfigurationTarget.Global);
        const selectedGameTag = path?.search(/Victoria/gi) > -1 ? 'vic3' : path?.search(/Imperator/gi) > -1 ? 'imperator' : 'ck3';
        await config.update("gameTag", selectedGameTag, vscode.ConfigurationTarget.Global);
    } catch (error: any) {
        log(`Failed to update path: ${error.message || error}`);
        vscode.window.showErrorMessage(
            "Failed to update path. Please check your permissions and try again."
        );
    }
}
