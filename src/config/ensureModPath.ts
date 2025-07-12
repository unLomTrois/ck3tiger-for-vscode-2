import * as vscode from "vscode";
import { log } from "../logger";

/**
 * Ensure that the Mod path is properly configured.
 * @param {vscode.WorkspaceConfiguration} config - The workspace configuration object.
 * @returns {Promise<void>}
 */
export async function ensureModPath(
    config: vscode.WorkspaceConfiguration
): Promise<void> {
    const modPath = config.get<string>("modPath");

    if (modPath) {
        return;
    }

    const newPath = await promptForModPath();

    if (newPath) {
        await updateModPath(config, newPath);
    } else {
        vscode.window.showErrorMessage(
            "ck3tiger.modPath not found. Please manually set the ck3path in the extension settings or try again."
        );
    }
}

/**
 * Prompt the user to set the Mod path.
 * @returns {Promise<string | undefined>} The selected Mod path, or undefined if the user cancels.
 */
async function promptForModPath(): Promise<string | undefined> {
    const userSelection = await vscode.window.showInformationMessage(
        "🐯 Let's find your mod file (CK3/Imperator) or root folder (Vic3)",
        "Open",
        "Cancel"
    );

    if (userSelection === "Open") {
        return await selectModPath();
    }

    return undefined;
}

/**
 * Open a dialog for selecting the mod folder path.
 * @returns {Promise<string | undefined>} The selected folder path, or undefined if none is selected.
 */
async function selectModPath(): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration("ck3tiger");
    const gameTag = config.get<string>("gameTag") || 'ck3';
    const folderUri = await vscode.window.showOpenDialog({
        canSelectFiles: gameTag !== 'vic3',
        canSelectFolders: gameTag === 'vic3',
        canSelectMany: false,
        openLabel: "Select .mod file (CK3/Imperator) or mod root dir (Vic3)",
        title: "Select .mod file (CK3/Imperator) or mod root dir (Vic3)",
        // todo: add a default path to documents/pdx/ck3/mod/ or /home/.local/share/pdx/ck3/mod/
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
        log("mod path selected: " + path);
    }
    return path;
}

/**
 * Update the path in the configuration.
 * @param {vscode.WorkspaceConfiguration} config - The workspace configuration object.
 * @param {string} path - The new path to set.
 */
async function updateModPath(
    config: vscode.WorkspaceConfiguration,
    path: string
) {
    log(`ck3tiger.modPath was set to ${path}`);
    try {
        await config.update(
            "modPath",
            path,
            vscode.ConfigurationTarget.Global
        );
    } catch (error: any) {
        log(`Failed to update ck3tiger.modPath: ${error.message || error}`);
        vscode.window.showErrorMessage(
            "Failed to update ck3tiger.modPath. Please manually set the mod path in the extension settings or try again."
        );
    }
}
