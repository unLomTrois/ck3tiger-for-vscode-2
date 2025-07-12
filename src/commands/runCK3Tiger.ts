import * as vscode from "vscode";
import { promisify } from "node:util";
import { exec } from "node:child_process";
import { checkConfiguration, getPaths } from "../config/configuration";
import { generateDiagnostics } from "../diagnostics";
import { TigerReport, VscodeProgress } from "../types";
import { log } from "../logger";
import { getTigerLogPath, parseTigerLogFile } from "../utils/tigerLog";

const execAsync = promisify(exec);

export function runCK3Tiger() {
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Window,
            title: "ck3tiger",
            cancellable: false,
        },
        executeValidationWithProgress
    );
}

async function executeValidationWithProgress(
    progress: VscodeProgress
) {
    progress.report({ message: "Getting paths" });

    const { ck3Path, tigerPath, modPath } = await getPaths();

    // check if paths are set
    if (!ck3Path || !tigerPath || !modPath) {
        await checkConfiguration();
        return;
    }

    const tigerLogPath = getTigerLogPath(tigerPath);

    progress.report({ message: `Running ck3tiger` });
    const command = `"${tigerPath}" --game "${ck3Path}" --json "${modPath}" > "${tigerLogPath}"`;

    log(`Running ck3tiger:\n> ${command}\n`);
    await executeCommandAsChildProcess(command);

    progress.report({ message: "Loading tiger.json" });
    const tigerReports = await parseTigerLogFile(tigerLogPath);

    progress.report({ message: "Generating problems" });
    generateDiagnostics(tigerReports);
}

/**
 * Executes a command as a child process
 * @param command The full command string to execute
 * @returns The stdout output from the command
 */
async function executeCommandAsChildProcess(command: string): Promise<string> {
    const { stdout, stderr } = await execAsync(command);

    if (stdout) {
        log(stdout);
    }

    if (stderr) {
        log(stderr);
    }

    return stdout;
}
