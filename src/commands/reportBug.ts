import * as vscode from "vscode";
import { log } from "../logger";

/**
 * Opens the GitHub issues page for the extension.
 */
export function reportBug(): void {
    log("Opening GitHub issues page");
    const target = vscode.Uri.parse("https://github.com/unLomTrois/ck3tiger-for-vscode-2/issues");
    vscode.env.openExternal(target);
} 