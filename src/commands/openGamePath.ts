import fs from "fs";
import path from "path";
import * as vscode from "vscode";
import { log } from "../logger";

/**
 * Opens the game folder in file explorer.
 * @returns {Promise<void>}
 */
export async function openGamePath(): Promise<void> {
    const config = vscode.workspace.getConfiguration("tiger");
    const gamePath = config.get<string>("gamePath");

    if (!gamePath) {
        vscode.window.showErrorMessage(
            "tiger.gamePath not found. Please configure the game path first."
        );
        return;
    }

    if (!fs.existsSync(gamePath)) {
        vscode.window.showErrorMessage(
            `The configured game path (${gamePath}) does not exist.`
        );
        return;
    }

    const uri = vscode.Uri.file(gamePath);

    try {
        // Open the folder in the OS file explorer
        await vscode.env.openExternal(uri);
        log(`Opened game directory: ${gamePath}`);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Failed to open game directory: ${errorMessage}`);
        vscode.window.showErrorMessage(
            `Failed to open the game directory: ${errorMessage}`
        );
    }
} 