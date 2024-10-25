import * as vscode from "vscode";

import { checkConfiguration, resetPaths } from "../config/configuration";

export function resetPathsCommand(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand(
        "ck3tiger-for-vscode.resetPaths",
        async () => {
            await resetPaths();
            await checkConfiguration();
        }
    );

    context.subscriptions.push(disposable);
}
