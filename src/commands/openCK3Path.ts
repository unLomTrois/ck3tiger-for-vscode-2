import fs from "fs";
import path from "path";
import * as vscode from "vscode";
import { log } from "../logger";

/**
 * Opens the CK3 game folder in file explorer.
 * @returns {Promise<void>}
 */
export async function openCK3Path(): Promise<void> {
    const config = vscode.workspace.getConfiguration("ck3tiger");
    const ck3Path = config.get<string>("ck3Path");

    if (!ck3Path) {
        vscode.window.showErrorMessage(
            "ck3tiger.ck3Path not found. Please configure the CK3 game path first."
        );
        return;
    }

    if (!fs.existsSync(ck3Path)) {
        vscode.window.showErrorMessage(
            `The configured CK3 game path (${ck3Path}) does not exist.`
        );
        return;
    }

    const uri = vscode.Uri.file(ck3Path);

    try {
        // Open the folder in the OS file explorer
        await vscode.env.openExternal(uri);
        log(`Opened CK3 game directory: ${ck3Path}`);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Failed to open CK3 game directory: ${errorMessage}`);
        vscode.window.showErrorMessage(
            `Failed to open the CK3 game directory: ${errorMessage}`
        );
    }
} 