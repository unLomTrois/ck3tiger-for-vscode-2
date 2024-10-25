import * as vscode from "vscode";

import { checkConfiguration, resetPaths } from "../configuration";

export function resetPathsCommand(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand(
        "ck3tiger-for-vscode-2.resetPaths",
        async () => {
            await resetPaths();
            await checkConfiguration();
        }
    );

    context.subscriptions.push(disposable);
}
