import * as vscode from "vscode";
import path from "path";
import cp from "node:child_process";
import { checkConfiguration, getPaths } from "../config/configuration";
import { generateProblems } from "../diagnostics/generateProblems";
import { TigerReport } from "../types";
import { log } from "../logger";

export function runCK3TigerCommand(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand(
        "ck3tiger-for-vscode.runCk3tiger",
        runCK3TigerWithProgress
    );

    context.subscriptions.push(disposable);
}

const getTigerLog = (tigerPath: string) =>
    path.join(path.parse(tigerPath).dir, "tiger.json");

async function runCK3TigerWithProgress() {
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Window,
            title: "ck3tiger",
            cancellable: false,
        },
        handleTigerProgress
    );
}

async function handleTigerProgress(
    progress: vscode.Progress<{
        message?: string;
        increment?: number;
    }>
) {
    const { ck3Path, tigerPath, modPath } = await getPaths();

    // check if paths are set
    if (!ck3Path || !tigerPath || !modPath) {
        await checkConfiguration();
        return;
    }

    progress.report({
        message: `Running ck3tiger`,
    });

    const logPath = getTigerLog(tigerPath);

    await runCK3Tiger(tigerPath, ck3Path, modPath, logPath);

    progress.report({
        message: "Loading tiger.json",
    });

    const logData = await readTigerLog(logPath);

    progress.report({
        message: "Generating problems",
    });

    generateProblems(logData);
}

async function runCK3Tiger(
    tigerPath: string,
    ck3Path: string,
    modPath: string,
    logPath: string
) {
    const command = `"${tigerPath}" --ck3 "${ck3Path}" --json "${modPath}" > "${logPath}"`;
    await new Promise((resolve, reject) => {
        cp.exec(command, (err, stdout) => {
            if (err) {
                reject(err);
            }
            resolve(stdout);
        });
    });
}

/**
 * Reads and parses the tiger.json log file
 * @param logPath Path to the tiger.json log file
 * @returns Parsed tiger report data
 * @throws Error if the file cannot be read or parsed
 */
async function readTigerLog(logPath: string): Promise<TigerReport[]> {
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
