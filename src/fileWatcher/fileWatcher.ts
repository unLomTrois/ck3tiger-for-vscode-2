import * as vscode from "vscode";
import * as path from "path";
import { log } from "../logger";
import { getPaths } from "../config/configuration";
import { calculateFileHash } from "./calculateFileHash";

// File watcher constants
const CONFIG_SECTION = "ck3tiger";
const RUN_ON_SAVE_CONFIG = "experimental.runOnSave";
const PATTERNS_CONFIG = "experimental.patterns";
const DEFAULT_PATTERNS = "**/*.{txt,yml}";

// Global state 
let globalFileWatcher: vscode.FileSystemWatcher | undefined;
let globalDisposables: vscode.Disposable[] = [];
const fileHashes = new Map<string, string>();
const openDocuments = new Set<string>();

/**
 * Initializes the file watcher for automatic validation on save
 */
export function initFileWatcher(context: vscode.ExtensionContext): void {
    setupWatcher(context);

    // Listen for configuration changes
    const configListener = vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration(`${CONFIG_SECTION}.${RUN_ON_SAVE_CONFIG}`) || 
            event.affectsConfiguration(`${CONFIG_SECTION}.${PATTERNS_CONFIG}`) ||
            event.affectsConfiguration(`${CONFIG_SECTION}.modPath`)) {
            log("Configuration changed, updating file watcher");
            setupWatcher(context);
        }
    });

    context.subscriptions.push(configListener);
}

/**
 * Returns the current file watcher, creating one if needed
 */
export function getFileWatcher(): vscode.FileSystemWatcher | undefined {
    return globalFileWatcher;
}

/**
 * Sets up or disposes the file watcher based on current configuration
 */
async function setupWatcher(context: vscode.ExtensionContext): Promise<void> {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    const runOnSave = config.get<boolean>(RUN_ON_SAVE_CONFIG, false);

    disposeExistingWatcher();

    if (!runOnSave) {
        log("Run on save feature is disabled");
        return;
    }

    const { modPath } = await getPaths();
    if (!modPath) {
        log("No mod path configured");
        return;
    }

    try {
        createWatcher(context, modPath, config);
        log("File watcher set up successfully");
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error setting up file watcher: ${errorMessage}`);
        vscode.window.showErrorMessage(`Failed to set up automatic validation: ${errorMessage}`);
    }
}

/**
 * Creates a file system watcher for the specified mod path
 */
function createWatcher(
    context: vscode.ExtensionContext, 
    modPath: string, 
    config: vscode.WorkspaceConfiguration
): void {
    const modFilePath = path.dirname(modPath);
    log(`Setting up file watcher for directory: ${modFilePath}`);

    const patterns = config.get<string>(PATTERNS_CONFIG, DEFAULT_PATTERNS);
    const globPattern = new vscode.RelativePattern(modFilePath, patterns);
    
    globalFileWatcher = vscode.workspace.createFileSystemWatcher(globPattern, true, false, false);
    context.subscriptions.push(globalFileWatcher);

    if (!globalFileWatcher) {
        log("Failed to create file watcher");
        return;
    }

    log("File watcher created");
    registerEventHandlers(context, modFilePath, patterns);
}

/**
 * Registers event handlers for file watching and document tracking
 */
function registerEventHandlers(
    context: vscode.ExtensionContext, 
    basePath: string, 
    patterns: string
): void {
    // File change event
    const fileChangeHandler = globalFileWatcher!.onDidChange(async (uri) => {
        handleFileChange(uri);
    });
    globalDisposables.push(fileChangeHandler);
    
    // Document open event
    const docOpenHandler = vscode.workspace.onDidOpenTextDocument(async (document) => {
        const filePath = document.uri.fsPath;
        if (shouldTrackFile(filePath, basePath, patterns)) {
            openDocuments.add(filePath);
            const hash = await calculateFileHash(filePath);
            fileHashes.set(filePath, hash);
            log(`Tracking opened document: ${filePath}`);
        }
    });
    globalDisposables.push(docOpenHandler);
    
    // Document close event
    const docCloseHandler = vscode.workspace.onDidCloseTextDocument((document) => {
        const filePath = document.uri.fsPath;
        if (openDocuments.has(filePath)) {
            openDocuments.delete(filePath);
            log(`Stopped tracking closed document: ${filePath}`);
        }
    });
    globalDisposables.push(docCloseHandler);
    
    // Track initially open documents
    vscode.workspace.textDocuments.forEach(async (document) => {
        const filePath = document.uri.fsPath;
        if (shouldTrackFile(filePath, basePath, patterns)) {
            openDocuments.add(filePath);
            const hash = await calculateFileHash(filePath);
            fileHashes.set(filePath, hash);
            log(`Initially tracking open document: ${filePath}`);
        }
    });
    
    // Register all disposables
    globalDisposables.forEach(disposable => {
        context.subscriptions.push(disposable);
    });
}

/**
 * Handles file change events by comparing file hashes
 */
async function handleFileChange(uri: vscode.Uri): Promise<void> {
    const filePath = uri.fsPath;
    
    if (filePath.includes(".git")) {
        log(`Ignoring change in git file: ${filePath}`);
        return;
    }

    log(`File changed: ${filePath}`);
    
    const currentHash = await calculateFileHash(filePath);
    const previousHash = fileHashes.get(filePath);
    
    if (previousHash && previousHash === currentHash) {
        log(`File content unchanged, skipping validation: ${filePath}`);
        return;
    }
    
    fileHashes.set(filePath, currentHash);
    await vscode.commands.executeCommand("ck3tiger-for-vscode.runCk3tiger");
}

/**
 * Disposes the current file watcher and related resources
 */
function disposeExistingWatcher(): void {
    if (globalFileWatcher) {
        globalFileWatcher.dispose();
        globalFileWatcher = undefined;
        log("Disposed existing file watcher");
    }

    globalDisposables.forEach(disposable => {
        disposable.dispose();
    });
    globalDisposables = [];
    
    // Clear cached data
    fileHashes.clear();
    openDocuments.clear();
}

/**
 * Determines if a file should be tracked based on patterns
 */
function shouldTrackFile(filePath: string, basePath: string, patternString: string): boolean {
    if (filePath.includes(".git")) {
        return false;
    }
    
    if (!filePath.startsWith(basePath)) {
        return false;
    }
    
    const patterns = patternString.split(",");
    const filename = path.basename(filePath);
    
    for (const pattern of patterns) {
        const cleanPattern = pattern.trim().replace(/^\*\*\/\*\./, "").replace(/\{|\}/g, "");
        const extensions = cleanPattern.split(",").map(ext => ext.trim());
        for (const ext of extensions) {
            if (filename.endsWith(`.${ext}`)) {
                return true;
            }
        }
    }
    
    return false;
}