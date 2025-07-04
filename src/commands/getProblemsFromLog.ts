import * as vscode from "vscode";
import { getPaths } from "../config/configuration";
import { generateDiagnostics } from "../diagnostics";
import { log } from "../logger";
import { getTigerLogPath, parseTigerLogFile } from "../utils/tigerLog";

export function getProblemsFromLog() {
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Window,
            title: "tiger",
            cancellable: false,
        },
        getProblemsWithProgress
    );
}

async function getProblemsWithProgress(
    progress: vscode.Progress<{ message?: string; increment?: number }>
) {
    progress.report({ message: "Getting paths" });

    const { tigerPath } = await getPaths();

    if (!tigerPath) {
        vscode.window.showErrorMessage("tiger binary path is not set. Please configure it first.");
        return;
    }

    const tigerLogPath = getTigerLogPath(tigerPath);

    progress.report({ message: "Loading tiger.json" });
    
    try {
        const tigerReports = await parseTigerLogFile(tigerLogPath);

        progress.report({ message: "Generating problems" });
        generateDiagnostics(tigerReports);
        log("Problems loaded from existing log file");
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to load problems from log: ${errorMessage}`);
    }
} 