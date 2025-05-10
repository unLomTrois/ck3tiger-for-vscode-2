import * as vscode from "vscode";
import { log } from "../logger";
import { checkConfiguration } from "../config/configuration";

export async function resetPaths(): Promise<void> {
    log("Resetting paths");

    const config = vscode.workspace.getConfiguration("ck3tiger");

    const target = vscode.ConfigurationTarget.Global;

    await Promise.all([
        config.update("tigerPath", undefined, target),
        config.update("ck3Path", undefined, target),
        config.update("modPath", undefined, target),
    ]);

    await checkConfiguration();
}
