import * as vscode from "vscode";
import { log } from "../logger";
// import { supportedGames } from "../types";

/**
 * Ensure that the Paradox Game tag is set.
 * @param {vscode.WorkspaceConfiguration} config - The workspace configuration object.
 */
export async function ensureGameTag(config: vscode.WorkspaceConfiguration) {
    const gameTag = config.get<string>("gameTag");

    if (gameTag) {
        return;
    }

    const newGameTag = initGameTag(config);

    if (newGameTag) {
        updateGameTag(config, newGameTag);
    } else {
        vscode.window.showErrorMessage(
            "Game Tag not found. Please manually set the Game Tag in the extension settings or try again."
        );
    }
}

/**
 * Prompt the user to set the Game Tag.
 * @returns {Promise<string | undefined>} The selected Game Tag, or undefined if the user cancels.
 * @returns {string} The selected Game Tag, or undefined if the user cancels.
 */
// async function initGameTag(config: vscode.WorkspaceConfiguration): Promise<string | undefined> {
function initGameTag(config: vscode.WorkspaceConfiguration): string {
    const tigerPath = config.get<string>("tigerPath") || '';
    if (!tigerPath) {
        return "ck3";
    }
    if (tigerPath.search(/ck3/g) > -1) {
        return "ck3";
    }
    else if (tigerPath.search(/imperator/g) > -1) {
        return "imperator";
    }
    else if (tigerPath.search(/vic3/g) > -1) {
        return "vic3";
    } else { 
        return "ck3"; 
    }
}

// /**
//  * Show an information message to the user offering options to set the CK3 path.
//  * @returns {Promise<string | undefined>} The user's selection, or undefined if canceled.
//  */
// async function getUserSelection(): Promise<string | undefined> {
//     return await vscode.window.showInformationMessage(
//         "🐯 Let's input a game tag",
//         "Input tag",
//         "Cancel"
//     );
// }

// /**
//  * Open a dialog for selecting the CK3 folder path.
//  * @returns {Promise<string | undefined>} The selected folder path, or undefined if none is selected.
//  */
// async function selectGameTag(): Promise<string | undefined> {
//     const gameTag = await vscode.window.showInputBox({
//         prompt: 'Please enter a valid game tag (ck3, vic3, or imperator)',
//         placeHolder: 'vic3',
//         validateInput: (value: string) => {
//             if (!value) {
//                 return 'tag cannot be empty';
//             }
//             if (!supportedGames.includes(value)) {
//                 return 'must use one of the three supported games - ck3, vic3 or imperator';
//             } 
//             return null;
//         }
//     });

//     return gameTag;
// }

/**
 * Update the Game Tag in the configuration.
 * @param {vscode.WorkspaceConfiguration} config - The workspace configuration object.
 * @param {string} gameTag - The Game Tag to update in the configuration.
 */
async function updateGameTag(config: vscode.WorkspaceConfiguration, gameTag: string) {
    log(`Game Tag set to ${gameTag}`);
    try {
        await config.update("gameTag", gameTag, vscode.ConfigurationTarget.Global);
    } catch (error: any) {
        log(`Failed to update Game Tag: ${error.message || error}`);
        vscode.window.showErrorMessage(
            "Failed to update Game Tag. Please check your permissions and try again."
        );
    }
}
