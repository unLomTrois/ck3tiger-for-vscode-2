// import * as vscode from "vscode";
// import { generateProblems } from "../generateProblems";

// /**
//  * @param {vscode.OutputChannel} logger
//  * @param {vscode.DiagnosticCollection} diagnosticCollection
//  */
// function getProblemsFromLogCommand(
//     logger: vscode.OutputChannel,
//     diagnosticCollection: vscode.DiagnosticCollection
// ) {
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
