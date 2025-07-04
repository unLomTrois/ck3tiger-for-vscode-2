import * as vscode from "vscode";
import { log } from "../logger";
import { supportedGames } from "../types";

/**
 * Gets the active game for which to run the script validator - CK3, Vic3, or Imperator
 * @returns {string}
 */
export function getGameTag(): string {
    log("Getting selected game");

    const config = vscode.workspace.getConfiguration("ck3tiger");
    const gameTag = config.get<string>("gameTag");

    if (!gameTag) {
        vscode.window.showErrorMessage(
            "The selection for a supported Paradox game was not found. Please configure the supported Paradox game in the extension's settings."
        );
        return '';
    }

    if (!supportedGames.includes(gameTag)) {
        vscode.window.showErrorMessage(
            `The selected game (${gameTag}) is not among the supported Paradox games.`
        );
        return '';
    }

    return gameTag;
}
