import * as vscode from "vscode";
import { log } from "../logger";

/**
 * Registers the command to report bugs by opening the GitHub issues page.
 * @param {vscode.ExtensionContext} context - The extension context.
 */
export function reportBugCommand(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand(
        "ck3tiger-for-vscode.reportBug",
        reportBug
    );

    context.subscriptions.push(disposable);
}

/**
 * Opens the GitHub issues page for the extension.
 */
function reportBug(): void {
    log("Opening GitHub issues page");
    vscode.env.openExternal(vscode.Uri.parse("https://github.com/unLomTrois/ck3tiger-for-vscode-2/issues"));
} 