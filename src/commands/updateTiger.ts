import * as vscode from "vscode";
import cp from "node:child_process";
import { checkConfiguration, getPaths } from "../config/configuration";
import { log, logError } from "../logger";
import { VscodeProgress } from "../types";

export function updateTiger() {
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: "Updating tiger...",
            cancellable: true,
        },
        handleUpdateTigerProgress
    );
}

async function handleUpdateTigerProgress(progress: VscodeProgress) {
    try {
        const { tigerPath } = await getPaths();

        if (!tigerPath) {
            await checkConfiguration();
            return;
        }

        log("Updating tiger...");
        progress.report({ message: "Updating tiger...", increment: 10 });

        await executeTigerUpdate(tigerPath, progress);
        
        vscode.window.showInformationMessage("Tiger update completed successfully");
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Failed to update tiger: ${errorMessage}`);
        vscode.window.showErrorMessage(`Failed to update tiger: ${errorMessage}`);
    }
}

async function executeTigerUpdate(tigerPath: string, progress: VscodeProgress): Promise<void> {
    const command = `${tigerPath}`;
    const args = ["update"];
    
    const child = cp.spawn(command, args, { shell: true, stdio: 'pipe' });
    
    if (child.stdout) {
        child.stdout.on("data", async (data) => {
            const output = data.toString();
            log(output);

            if (!output.includes("Done")) {
                progress.report({ increment: 10 });
            }

            if (output.includes("Do you want to continue?")) {
                const userChoice = await promptForConfirmation();
                if (child.stdin) {
                    child.stdin.write(`${userChoice ? 'y' : 'n'}\n`);
                }
            }
        });
    }

    if (child.stderr) {
        child.stderr.on("data", (data) => {
            const message = data.toString();
            logError(message, `Error: ${message}`);
        });
    }
    
    // Convert the event-based process to a Promise
    return new Promise<void>((resolve, reject) => {
        child.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`Process exited with code ${code}`));
            } else {
                progress.report({
                    increment: 100,
                    message: "Update completed successfully",
                });
                resolve();
            }
        });
        
        child.on("error", (err) => {
            reject(err);
        });
    });
}

async function promptForConfirmation(): Promise<boolean> {
    const userAnswer = await vscode.window.showInformationMessage(
        "The new release will be downloaded/extracted and the existing binary will be replaced.",
        "Yes",
        "No"
    );
    
    return userAnswer === "Yes";
}
