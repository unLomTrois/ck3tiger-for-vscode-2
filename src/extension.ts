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

    log("Initializing ck3tiger extension");

    await checkConfiguration();

    initStatusBarButton(context);

    registerCommand("ck3tiger-for-vscode.runCk3tiger", commands.runCK3Tiger);
    registerCommand("ck3tiger-for-vscode.updateCk3tiger", commands.updateCK3Tiger);
    registerCommand("ck3tiger-for-vscode.resetPaths", commands.resetPaths);
    registerCommand("ck3tiger-for-vscode.openTigerPath", commands.openTigerPath);
    registerCommand("ck3tiger-for-vscode.openCK3Path", commands.openCK3Path);
    registerCommand("ck3tiger-for-vscode.getProblemsFromLog", commands.getProblemsFromLog);
    registerCommand("ck3tiger-for-vscode.reportBug", commands.reportBug);

    // Initialize file watcher for the "Run on Save" feature
    initFileWatcher(context);

    afterStartup(context);
}

async function afterStartup(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration("ck3tiger");

    const openPreviousLogOnStartup = config.get("openPreviousLogOnStartup");
    if (openPreviousLogOnStartup) {
        await vscode.commands.executeCommand("ck3tiger-for-vscode.getProblemsFromLog");
    }

    const checkUpdatesOnStartup = config.get("checkUpdatesOnStartup");
    if (checkUpdatesOnStartup) {
        log("Checking for ck3tiger updates on startup");
        await vscode.commands.executeCommand("ck3tiger-for-vscode.updateCk3tiger");
    }
}

// This method is called when your extension is deactivated
export function deactivate() { }
