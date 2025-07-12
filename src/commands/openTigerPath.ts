import fs from "fs";
import path from "path";
import * as vscode from "vscode";
import { log } from "../logger";

/**
 * Opens the tiger binary location in file explorer.
 * @returns {Promise<void>}
 */
export async function openTigerPath(): Promise<void> {
    const config = vscode.workspace.getConfiguration("ck3tiger");
    const tigerPath = config.get<string>("tigerPath");

    if (!tigerPath) {
        vscode.window.showErrorMessage(
            "ck3tiger.tigerPath not found. Please configure the tiger path first."
        );
        return;
    }

    if (!fs.existsSync(tigerPath)) {
        vscode.window.showErrorMessage(
            `The configured ck3tiger path (${tigerPath}) does not exist.`
        );
        return;
    }

    const tigerDirectory = path.dirname(tigerPath);
    const uri = vscode.Uri.file(tigerDirectory);

    try {
        // Open the folder in the OS file explorer
        await vscode.env.openExternal(uri);
        log(`Opened ck3tiger directory: ${tigerDirectory}`);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Failed to open tiger directory: ${errorMessage}`);
        vscode.window.showErrorMessage(
            `Failed to open the ck3tiger directory: ${errorMessage}`
        );
    }
}
 