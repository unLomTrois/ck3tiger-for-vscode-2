import * as vscode from "vscode";
import * as path from "path";
import { log } from "../logger";
import { getPaths } from "../config/configuration";

/**
 * File watcher for mod files that triggers ck3tiger validation on save
 * when the experimental feature is enabled in settings
 */
let fileWatcher: vscode.FileSystemWatcher | undefined;
let watcherDisposable: vscode.Disposable | undefined;

/**
 * Initializes the file watcher for automatic validation on save
 * @param context Extension context for disposing the watcher when deactivated
 */
export function initFileWatcher(context: vscode.ExtensionContext): void {
    // Initial setup of watcher based on current configuration
    setupFileWatcher(context);

    // Listen for configuration changes to update watcher as needed
    const configListener = vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("ck3tiger.experimental.runOnSave") || 
            event.affectsConfiguration("ck3tiger.experimental.runOnSave.patterns") ||
            event.affectsConfiguration("ck3tiger.modPath")) {
            log("Configuration changed, updating file watcher");
            setupFileWatcher(context);
        }
    });

    context.subscriptions.push(configListener);
}

/**
 * Sets up or disposes the file watcher based on current configuration
 * @param context Extension context
 */
async function setupFileWatcher(context: vscode.ExtensionContext): Promise<void> {
    const config = vscode.workspace.getConfiguration("ck3tiger");
    const runOnSave = config.get<boolean>("experimental.runOnSave", false);

    // Dispose of any existing watcher
    disposeFileWatcher();

    if (!runOnSave) {
        log("Run on save feature is disabled, not setting up file watcher");
        return;
    }

    const { modPath } = await getPaths();
    if (!modPath) {
        log("No mod path configured, cannot set up file watcher");
        return;
    }

    try {
        // Get the directory of the mod file
        const modFilePath = path.dirname(modPath);
        log(`Setting up file watcher for directory: ${modFilePath}`);

        // Create a file system watcher for all files in the mod directory
        // Exclude .git folder and .txt.git files

        const patterns = config.get<string>("experimental.patterns", "**/*.{txt,yml}");
        const globPattern = new vscode.RelativePattern(modFilePath, patterns);
        fileWatcher = vscode.workspace.createFileSystemWatcher(globPattern, true, false, false);

        if (fileWatcher) {
            log("File watcher created, excluding .git folder");
            // Skip .git directory files completely
            watcherDisposable = fileWatcher.onDidChange(async (uri) => {
                // Skip any files that contain .git in their path
                if (uri.fsPath.includes(".git")) {
                    log(`Ignoring change in git file: ${uri.fsPath}`);
                    return;
                }

                log(`File changed: ${uri.fsPath}`);
                await vscode.commands.executeCommand("ck3tiger-for-vscode.runCk3tiger");
            });
        }

        context.subscriptions.push(fileWatcher);
        if (watcherDisposable) {
            context.subscriptions.push(watcherDisposable);
        }
        log("File watcher set up successfully");
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error setting up file watcher: ${errorMessage}`);
        vscode.window.showErrorMessage(`Failed to set up automatic validation: ${errorMessage}`);
    }
}

/**
 * Disposes the current file watcher if it exists
 */
function disposeFileWatcher(): void {
    if (fileWatcher) {
        fileWatcher.dispose();
        fileWatcher = undefined;
        log("Disposed existing file watcher");
    }

    if (watcherDisposable) {
        watcherDisposable.dispose();
        watcherDisposable = undefined;
    }
} 