// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { initLogger, log } from "./logger";
import { checkConfiguration } from "./config/configuration";
import { initStatusBarButton } from "./statusBar";
import { ContextContainer } from "./context";
import { initFileWatcher } from "./fileWatcher/fileWatcher";
import * as commands from "./commands";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    ContextContainer.context = context;

    const registerCommand = commands.createRegisterCommand(context);

    initLogger();

    log("Initializing tiger extension");

    await checkConfiguration();

    initStatusBarButton(context);

    registerCommand("tiger-for-vscode.runTiger", commands.runTiger);
    registerCommand("tiger-for-vscode.updateTiger", commands.updateTiger);
    registerCommand("tiger-for-vscode.resetPaths", commands.resetPaths);
    registerCommand("tiger-for-vscode.openTigerPath", commands.openTigerPath);
    registerCommand("tiger-for-vscode.openGamePath", commands.openGamePath);
    registerCommand("tiger-for-vscode.getProblemsFromLog", commands.getProblemsFromLog);
    registerCommand("tiger-for-vscode.reportBug", commands.reportBug);

    // Initialize file watcher for the "Run on Save" feature
    initFileWatcher(context);

    afterStartup(context);
}

async function afterStartup(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration("tiger");

    const openPreviousLogOnStartup = config.get("openPreviousLogOnStartup");
    if (openPreviousLogOnStartup) {
        await vscode.commands.executeCommand("tiger-for-vscode.getProblemsFromLog");
    }

    const checkUpdatesOnStartup = config.get("checkUpdatesOnStartup");
    if (checkUpdatesOnStartup) {
        log("Checking for tiger updates on startup");
        await vscode.commands.executeCommand("tiger-for-vscode.updateTiger");
    }
}

// This method is called when your extension is deactivated
export function deactivate() { }
