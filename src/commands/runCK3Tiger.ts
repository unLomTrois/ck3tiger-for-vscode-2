import * as vscode from "vscode";
import path from "path";
import cp from "node:child_process";
import { checkConfiguration, getPaths } from "../config/configuration";
import { generateProblems } from "../generateProblems";

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

    const log_path = getTigerLog(tigerPath);

    await runCK3Tiger(tigerPath, ck3Path, modPath, log_path);

    progress.report({
        message: "Loading tiger.json",
    });

    const logData = await readTigerLog(log_path);

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

async function readTigerLog(log_path: string) {
    try {
        const log_uri = vscode.Uri.file(log_path);
        const log_file = await vscode.workspace.fs.readFile(log_uri);
        const log_data = JSON.parse(Buffer.from(log_file).toString());
        return log_data;
    } catch (err: any) {
        vscode.window.showErrorMessage(
            `Failed to read or parse tiger log file: ${err.message}`
        );
        throw new Error(
            `Failed to read or parse tiger log file: ${err.message}`
        );
    }
}
