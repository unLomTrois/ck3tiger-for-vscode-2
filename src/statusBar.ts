import * as vscode from "vscode";

/**
 * Initialize the status bar button.
 * @param {vscode.ExtensionContext} context - The extension context.
 */
export function initStatusBarButton(context: vscode.ExtensionContext): void {
    const statusBarButton = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
    statusBarButton.text = "🐅Run tiger🐅";
    statusBarButton.tooltip =
        "This will run tiger in the background and updates the problems tab";
    statusBarButton.command = "tiger-for-vscode.runTiger";
    statusBarButton.show();

    context.subscriptions.push(statusBarButton);
}
