import * as vscode from "vscode";
import { TigerLocation } from "../types";

/**
 * Creates a VS Code Range from a ck3tiger location
 * Handles cases where line numbers or columns are null (file-level errors)
 * @param location The location information from ck3tiger
 * @returns A VS Code Range object pointing to the appropriate position
 */
export function createRangeFromTigerLocation(location: TigerLocation): vscode.Range {
    // if error is for the whole file (like encoding errors, match the whole first line)
    if (location.linenr === null || location.column === null) {
        // Returning a default range of (0, 0) to (0, 1) to indicate an unspecified location.
        // This helps distinguish it from a genuine empty range.
        return new vscode.Range(0, 0, 0, 1);
    }

    const start = new vscode.Position(location.linenr - 1, location.column - 1);

    const end = new vscode.Position(
        location.linenr - 1,
        location.length
            ? location.column - 1 + location.length
            : location.line.length
    );

    return new vscode.Range(start, end);
}
