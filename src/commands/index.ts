import * as vscode from "vscode";

export { runTiger } from "./runTiger";
export { updateTiger } from "./updateTiger";
export { resetPaths } from "./resetPaths";
export { openTigerPath } from "./openTigerPath";
export { openGamePath } from "./openGamePath";
export { getProblemsFromLog } from "./getProblemsFromLog";
export { reportBug } from "./reportBug";

export function createRegisterCommand(ctx: vscode.ExtensionContext) {
    return function registerCommand(name: string, fn: () => void) {
        const disposable = vscode.commands.registerCommand(name, fn);
        ctx.subscriptions.push(disposable);
    };
}