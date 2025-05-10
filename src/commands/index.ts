import * as vscode from "vscode";

export { runCK3Tiger } from "./runCK3Tiger";
export { updateCK3TigerCommand } from "./updateCK3Tiger";
export { resetPathsCommand } from "./resetPaths";
export { openTigerPathCommand } from "./openTigerPath";
export { openCK3PathCommand } from "./openCK3Path";
export { getProblemsFromLogCommand } from "./getProblemsFromLog";

export function createRegisterCommand(ctx: vscode.ExtensionContext) {
    return function registerCommand(name: string, fn: () => void) {
        const disposable = vscode.commands.registerCommand(name, fn);
        ctx.subscriptions.push(disposable);
    };
}