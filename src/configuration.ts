import * as vscode from "vscode";
import { log } from "./logger";
import { ensureCK3Path } from "./ensureCK3Path";
import { ensureModPath } from "./ensureModPath";
import { ensureTigerPath } from "./ensureTigerPath";

// Entry point to check and ensure the configuration is properly set.
export async function checkConfiguration() {
    log("Checking configuration");

    // Fetch the extension configuration settings
    const config = vscode.workspace.getConfiguration("ck3tiger");

    // Ensure that the CK3 path is set in the configuration
    await ensureTigerPath(config);
    await ensureCK3Path(config);
    await ensureModPath(config);
}

/**
 * Get the paths from the configuration.
 */
export async function getPaths() {
    const config = vscode.workspace.getConfiguration("ck3tiger");

    const tigerPath = config.get<string>("tigerPath");
    const ck3Path = config.get<string>("ck3Path");
    const modPath = config.get<string>("modPath");

    return {
        tigerPath,
        ck3Path,
        modPath,
    };
}

/**
 * Reset the paths in the global configuration.
 */
export async function resetPaths() {
    log("Resetting paths");

    const config = vscode.workspace.getConfiguration("ck3tiger");

    await config.update(
        "tigerPath",
        undefined,
        vscode.ConfigurationTarget.Global
    );
    await config.update(
        "ck3Path",
        undefined,
        vscode.ConfigurationTarget.Global
    );
    await config.update(
        "modPath",
        undefined,
        vscode.ConfigurationTarget.Global
    );
}
