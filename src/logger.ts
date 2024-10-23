import * as vscode from "vscode";
import { LogLevel } from "vscode";

let logger: vscode.OutputChannel;

export function init() {
    logger = vscode.window.createOutputChannel("ck3tiger-for-vscode");
}
const level: LogLevel = LogLevel.Debug;

export function log(...values: unknown[]) {
    logger.appendLine(values.join(" "));
}

export function logDebug(...values: unknown[]) {
    if (level > LogLevel.Debug) {
        return;
    }

    logger.appendLine(values.join(" "));
}

export function logError(e: Error, ...values: unknown[]) {
    logger.appendLine(values.join(" "));
    logger.appendLine(e.message);
    if (e.stack) {
        logger.appendLine(e.stack);
    }
}

export function revealLog() {
    logger.show();
}
