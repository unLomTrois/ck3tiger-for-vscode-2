import * as vscode from "vscode";
import { log } from "../logger";
import { checkConfiguration } from "../config/configuration";

export async function resetPaths(): Promise<void> {
    log("Resetting paths");

    const config = vscode.workspace.getConfiguration("tiger");

    const target = vscode.ConfigurationTarget.Global;

    await Promise.all([
        config.update("gamePath", undefined, target),
        config.update("modPath", undefined, target),
        config.update("tigerPath", undefined, target),
    ]);

    await checkConfiguration();
}
