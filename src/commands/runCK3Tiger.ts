import * as vscode from "vscode";
import cp from "child_process";
import path from "path";
import { checkConfiguration, getPaths } from "../configuration";
import { generateProblems } from "../generateProblems";

export function runCK3TigerCommand(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand(
        "ck3tiger-for-vscode-2.runCk3tiger",
        runCK3TigerWithProgress
    );

    context.subscriptions.push(disposable);
}

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

async function handleTigerProgress (
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

const getTigerLog = (tigerPath: string) =>
    path.join(path.parse(tigerPath).dir, "tiger.json");

async function runCK3Tiger(
    tigerPath: string,
    ck3Path: string,
    modPath: string,
    logPath: string
) {
    await new Promise((resolve, reject) => {
        cp.exec(
            `"${tigerPath}" --ck3 "${ck3Path}" --json "${modPath}" > "${logPath}"`,
            (err, stdout) => {
                if (err) {
                    reject(err);
                }
                resolve(stdout);
            }
        );
    });
}

// /**
//  * @param {vscode.OutputChannel} logger
//  */
// function resetPathsCommand(logger) {
//     return vscode.commands.registerCommand(
//         "ck3tiger-for-vscode.resetPaths",
//         async () => {
//             await resetPaths(logger);
//             await checkPaths(logger);
//         }
//     );
// }

// /**
//  * @param {vscode.OutputChannel} logger
//  * @param {vscode.DiagnosticCollection} diagnosticCollection
//  */
// function getProblemsFromLogCommand(logger, diagnosticCollection) {
//     return vscode.commands.registerCommand(
//         "ck3tiger-for-vscode.getProblemsFromLog",
//         async () => {
//             const { ck3tiger_path } = await checkPaths(logger);

//             vscode.window.withProgress(
//                 {
//                     location: vscode.ProgressLocation.Window,
//                     title: "ck3tiger",
//                     cancellable: false,
//                 },
//                 async (progress) => {
//                     progress.report({
//                         message: "Loading tiger.json",
//                     });

//                     const log_path = path.join(
//                         path.parse(ck3tiger_path).dir,
//                         "tiger.json"
//                     );

//                     const log_uri = vscode.Uri.file(log_path);
//                     try {
//                         await vscode.workspace.fs.stat(log_uri);
//                         vscode.window.showTextDocument(log_uri, {
//                             viewColumn: vscode.ViewColumn.Beside,
//                         });
//                     } catch (e) {
//                         vscode.window.showErrorMessage(
//                             "tiger.json doesn't exist. Run ck3tiger first."
//                         );
//                         vscode.window.showInformationMessage(
//                             "tiger.json must be in the same folder as ck3tiger binary"
//                         );
//                         return;
//                     }

//                     // read file:
//                     const log_data = await readTigerLog(log_uri);

//                     progress.report({
//                         message: "Generating problems",
//                     });

//                     generateProblems(diagnosticCollection, log_data);
//                 }
//             );
//         }
//     );
// }

async function readTigerLog(log_path: string) {
    const log_uri = vscode.Uri.file(log_path);
    const log_file = await vscode.workspace.fs.readFile(log_uri);
    const log_data = JSON.parse(Buffer.from(log_file).toString());
    return log_data;
}
