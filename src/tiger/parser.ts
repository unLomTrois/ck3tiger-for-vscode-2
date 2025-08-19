import * as vscode from "vscode";
import * as path from "path";
import { TigerReport } from "../types";
import { log } from "../logger";

/**
 * Gets the path to the tiger.json log file
 * @param tigerPath Path to the tiger executable
 * @returns Path to the tiger.json file in the same directory as the executable
 */
export function getTigerLogPath(tigerPath: string): string {
    const tigerDirectory = path.dirname(tigerPath);
    return path.join(tigerDirectory, "tiger.json");
}

/**
 * Reads and parses the tiger.json log file
 * @param logPath Path to the tiger.json log file
 * @returns {TigerReport[]} Parsed tiger report data
 * @throws Error if the file cannot be read or parsed
 */
export async function parseTigerLogFile(logPath: string): Promise<TigerReport[]> {
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