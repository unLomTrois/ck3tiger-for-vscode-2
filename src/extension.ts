// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as os from "os";
import * as vscode from "vscode";

import { initLogger, log } from "./logger";
import { checkConfiguration } from "./config/configuration";
import { initStatusBarButton } from "./ui/statusBar";
import { initFileWatcher } from "./fileWatcher/fileWatcher";
import * as commands from "./commands";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    if (!isPlatformSupported()) {
        return undefined;
    }

    initLogger();

    context.subscriptions.push(vscode.commands.registerCommand('getContext', () => context));

    await checkConfiguration();

    initStatusBarButton(context);

    const registerCommand = commands.createRegisterCommand(context);
    registerCommand("ck3tiger-for-vscode.runCk3tiger", commands.runCK3Tiger);
    registerCommand("ck3tiger-for-vscode.updateCk3tiger", commands.updateCK3Tiger);
    registerCommand("ck3tiger-for-vscode.resetPaths", commands.resetPaths);
    registerCommand("ck3tiger-for-vscode.openTigerPath", commands.openTigerPath);
    registerCommand("ck3tiger-for-vscode.openCK3Path", commands.openCK3Path);
    registerCommand("ck3tiger-for-vscode.getProblemsFromLog", commands.getProblemsFromLog);
    registerCommand("ck3tiger-for-vscode.reportBug", commands.reportBug);

    // Initialize file watcher for the "Run on Save" feature
    initFileWatcher(context);

    executeOnStartupCommands();
}

function isPlatformSupported(): boolean {
    const platform = os.platform();
    const supportedPlatforms: NodeJS.Platform[] = ["win32", "linux"]; // At the moment (2025-08-19), tiger does not support macOS.

    if (!supportedPlatforms.includes(platform)) {
        let message: string;
        switch (platform) {
            case "darwin": // macOS
                message = "Unfortunately, ck3-tiger does not support macOS at the moment.";
                break;
            default:
                message = `Your platform (${platform}) is unsupported.`;
        }
        message += `\nSupported platforms are: ${supportedPlatforms.join(", ")}`;
        
        // TODO: change the link if the issue is resolved
        const issueUrl = "https://github.com/amtep/tiger/issues/275";
        vscode.window.showErrorMessage(message, "Read More").then((selection) => {
            if (selection === "Read More") {
                vscode.env.openExternal(vscode.Uri.parse(issueUrl));
            }
        });
        return false;
    }

    return true;
}

async function executeOnStartupCommands() {
    const config = vscode.workspace.getConfiguration("ck3tiger");

    if (config.get<boolean>("openPreviousLogOnStartup")) {
        await vscode.commands.executeCommand("ck3tiger-for-vscode.getProblemsFromLog");
    }

    if (config.get<boolean>("checkUpdatesOnStartup")) {
        log("Checking for ck3tiger updates on startup");
        await vscode.commands.executeCommand("ck3tiger-for-vscode.updateCk3tiger");
    }
}

// This method is called when your extension is deactivated
export function deactivate() { }
