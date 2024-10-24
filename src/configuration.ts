import * as vscode from "vscode";
import { log } from "./logger";
import { ensureCK3Path } from "./ensureCK3Path";
import  { ensureModPath } from "./ensureModPath";
import { ensureTigerPath } from "./ensureTigerPath";

// Entry point to check and ensure the configuration is properly set.
export async function checkConfiguration() {
    log("Checking configuration");

    // Fetch the extension configuration settings
    const config = vscode.workspace.getConfiguration("ck3tiger-for-vscode-2");

    // Ensure that the CK3 path is set in the configuration
    await ensureTigerPath(config)
    await ensureCK3Path(config);
    await ensureModPath(config);
}