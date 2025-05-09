import * as vscode from "vscode";
import path from "path";
import { promisify } from "node:util";
import { exec } from "node:child_process";
import { checkConfiguration, getPaths } from "../config/configuration";
import { generateProblems } from "../diagnostics/generateProblems";
import { TigerReport } from "../types";
import { log } from "../logger";

const execAsync = promisify(exec);

export function runCK3TigerCommand(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand(
        "ck3tiger-for-vscode.runCk3tiger",
        displayValidationProgressUI
    );

    context.subscriptions.push(disposable);
}

/**
 * Gets the path to the tiger.json log file
 * @param tigerPath Path to the tiger executable
 * @returns Path to the tiger.json file in the same directory as the executable
 */
function getTigerLogPath(tigerPath: string): string {
    const tigerDirectory = path.dirname(tigerPath);
    return path.join(tigerDirectory, "tiger.json");
}

async function displayValidationProgressUI() {
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
    progress: vscode.Progress<{
        message?: string;
        increment?: number;
    }>
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
    const command = `"${tigerPath}" --ck3 "${ck3Path}" --json "${modPath}" > "${tigerLogPath}"`;

    log(`Running ck3tiger:\n> ${command}\n`);
    await executeCommandAsChildProcess(command);

    progress.report({ message: "Loading tiger.json" });
    const tigerReports = await parseTigerLogFile(tigerLogPath);

    progress.report({ message: "Generating problems" });
    generateProblems(tigerReports);
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

/**
 * Reads and parses the tiger.json log file
 * @param logPath Path to the tiger.json log file
 * @returns {TigerReport[]} Parsed tiger report data
 * @throws Error if the file cannot be read or parsed
 */
async function parseTigerLogFile(logPath: string): Promise<TigerReport[]> {
    const logUri = vscode.Uri.file(logPath);

    try {
        // Read the file
        const logFile = await vscode.workspace.fs.readFile(logUri);
        // Parse the JSON content
        const logData = JSON.parse(Buffer.from(logFile).toString()) as TigerReport[];
        return logData;
    } catch (error: unknown) {
        // Determine if it's a parsing error or a file reading error
        const isParseError = error instanceof SyntaxError;
        const errorType = isParseError ? "parse" : "read";

        const errorMessage = `Failed to ${errorType} tiger log file: ${error instanceof Error ? error.message : 'Unknown error'}`;
        log(errorMessage);
        vscode.window.showErrorMessage(errorMessage);
        throw new Error(errorMessage);
    }
}
