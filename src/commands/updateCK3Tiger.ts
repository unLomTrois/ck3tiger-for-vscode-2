import * as vscode from "vscode";
import cp from "node:child_process";
import { checkConfiguration, getPaths } from "../config/configuration";
import { log, logError, revealLog } from "../logger";
import { VscodeProgress } from "../types";

export function updateCK3TigerCommand(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand(
        "ck3tiger-for-vscode.updateCk3tiger",
        () =>
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: "ck3tiger update",
                    cancellable: true,
                },
                handleUpdateTigerProgress
            )
    );
    context.subscriptions.push(disposable);
}

async function handleUpdateTigerProgress(progress: VscodeProgress) {
    try {
        const { tigerPath } = await getPaths();

        if (!tigerPath) {
            await checkConfiguration();
            return;
        }

        revealLog();
        log("Updating ck3-tiger...");
        progress.report({ message: "Updating ck3tiger...", increment: 10 });

        await updateCK3Tiger(tigerPath, progress);
    } catch (error: any) {
        log(`Failed to update ck3tiger: ${error.message || error}`);
        vscode.window.showErrorMessage("Failed to update ck3tiger...");
    }
}

async function updateCK3Tiger(tigerPath: string, progress: VscodeProgress) {
    const command = `${tigerPath}`;
    const args = ["update"];

    return new Promise<void>((resolve, reject) => {
        const child = cp.spawn(command, args, { shell: true });

        child.stdout.on("data", async (data) => {
            const output = data.toString();
            log(output);

            if (!output.includes("Done")) {
                progress.report({ increment: 10 });
            }

            if (output.includes("Do you want to continue?")) {
                const userAnswer = await vscode.window.showInformationMessage(
                    "The new release will be downloaded/extracted and the existing binary will be replaced.",
                    "Yes",
                    "No"
                );

                if (userAnswer === "Yes") {
                    child.stdin.write("y\n");
                } else {
                    child.stdin.write("n\n");
                }
            }
        });

        child.stderr.on("data", (data) => {
            const message = data.toString();
            logError(message, `Error: ${message}`);
        });

        child.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`Update process exited with code ${code}`));
            } else {
                progress.report({
                    increment: 100,
                    message: "Update completed successfully",
                });
                resolve();
            }
        });
    });
}
