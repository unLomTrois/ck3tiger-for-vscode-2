// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { init as initLogger, log, revealLog } from "./logger";
import { checkConfiguration } from "./config/configuration";
import { initStatusBarButton } from "./statusBar";
import { runCK3TigerCommand } from "./commands/runCK3Tiger";
import { resetPathsCommand } from "./commands/resetPaths";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    initLogger();
    revealLog();

    log("Initializing ck3tiger extension");

    await checkConfiguration();

    initStatusBarButton(context);

    runCK3TigerCommand(context);
    resetPathsCommand(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
