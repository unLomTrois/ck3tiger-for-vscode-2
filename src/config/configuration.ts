import * as vscode from "vscode";
import { log } from "../logger";
import { ensureGamePath } from "./ensureGamePath";
import { ensureModPath } from "./ensureModPath";
import { ensureTigerPath } from "./ensureTigerPath";

// Entry point to check and ensure the configuration is properly set.
export async function checkConfiguration() {
    log("Checking configuration");

    // Fetch the extension configuration settings
    const config = vscode.workspace.getConfiguration("tiger");

    // Ensure that the game path is set in the configuration
    await ensureGamePath(config);
    await ensureModPath(config);
    await ensureTigerPath(config);
}

/**
 * Get the paths from the configuration.
 */
export async function getPaths() {
    const config = vscode.workspace.getConfiguration("tiger");

    const gamePath = config.get<string>("gamePath");
    const modPath = config.get<string>("modPath");
    const tigerPath = config.get<string>("tigerPath");

    return {
        gamePath,
        modPath,
        tigerPath,
    };
}
