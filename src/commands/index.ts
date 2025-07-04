import * as vscode from "vscode";

export { runCK3Tiger } from "./runCK3Tiger";
export { updateCK3Tiger } from "./updateCK3Tiger";
export { resetPaths } from "./resetPaths";
export { openTigerPath } from "./openTigerPath";
export { openCK3Path } from "./openCK3Path";
export { getProblemsFromLog } from "./getProblemsFromLog";
export { reportBug } from "./reportBug";
export { getGameTag } from "./getGameTag";

export function createRegisterCommand(ctx: vscode.ExtensionContext) {
    return function registerCommand(name: string, fn: () => void) {
        const disposable = vscode.commands.registerCommand(name, fn);
        ctx.subscriptions.push(disposable);
    };
}