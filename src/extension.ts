// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { initLogger, log } from "./logger";
import { checkConfiguration } from "./config/configuration";
import { initStatusBarButton } from "./statusBar";
import { runCK3TigerCommand } from "./commands/runCK3Tiger";
import { resetPathsCommand } from "./commands/resetPaths";
import { updateCK3TigerCommand } from "./commands/updateCK3Tiger";
import { openTigerPathCommand } from "./commands/openTigerPath";
import { ContextContainer } from "./context";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    ContextContainer.context = context;
    
    initLogger();

    log("Initializing ck3tiger extension");

    await checkConfiguration();

    initStatusBarButton(context);

    runCK3TigerCommand(context);
    updateCK3TigerCommand(context);
    resetPathsCommand(context);
    openTigerPathCommand(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
