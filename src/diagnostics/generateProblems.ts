import * as vscode from "vscode";
import { getDiagnosticCollection } from "./collection";
import { log, revealLog } from "../logger";
import {
    confidenceLevels,
    ErrorEntry,
    TigerConfidence,
    TigerLocation,
    TigerSeverity,
} from "../types";

/**
 * Generates VS Code diagnostics from ck3tiger validation results
 * @param logData The parsed JSON output from ck3tiger
 * @returns The diagnostic collection with errors mapped to files
 */
export function generateProblems(logData: ErrorEntry[]): vscode.DiagnosticCollection {
    const diagnosticCollection = getDiagnosticCollection();

    diagnosticCollection.clear();

    const diagnosticsByFile = groupProblemsByFile(logData);

    // Update the diagnostic collection for each file
    for (const [filePath, diagnostics] of Object.entries(diagnosticsByFile)) {
        const fileUri = vscode.Uri.file(filePath);
        diagnosticCollection.set(fileUri, diagnostics);
    }

    return diagnosticCollection;
}

type DiagnosticsByFile = { [filePath: string]: vscode.Diagnostic[] };

/**
 * Groups problems by file path and filters by confidence level
 * @param problems Array of error entries from ck3tiger
 * @returns Object mapping file paths to arrays of diagnostics
 */
function groupProblemsByFile(problems: ErrorEntry[]): DiagnosticsByFile {
    const diagnosticsByFile: DiagnosticsByFile = {};

    const config = vscode.workspace.getConfiguration("ck3tiger");

    const minConfidence: TigerConfidence =
        config.get<TigerConfidence>("minConfidence") ?? "weak";

    for (const problem of problems) {
        // Continue if problem's confidence is lower than minConfidence
        if (
            confidenceLevels.indexOf(problem.confidence) <
            confidenceLevels.indexOf(minConfidence)
        ) {
            continue;
        }

        processProblemIntoDiagnostics(problem, diagnosticsByFile);
    }

    return diagnosticsByFile;
}

/**
 * Processes a single problem into VS Code diagnostics
 * Handles both primary locations and related sub-locations
 * @param problem The error entry to process
 * @param diagnosticsByFile The map of file paths to diagnostics arrays to update
 */
function processProblemIntoDiagnostics(
    problem: ErrorEntry,
    diagnosticsByFile: DiagnosticsByFile
): void {
    try {
        const location = problem.locations[0];

        // skip if it is colors problem (not stable enough)
        if (problem.key === "colors") {
            console.log("Skipping problem with null line number");
            console.log(problem);
            return;
        }

        const filePath = location.fullpath;

        // Create an array of diagnostics for the current file if it doesn't exist
        if (!diagnosticsByFile[filePath]) {
            diagnosticsByFile[filePath] = [];
        }

        const diagnostic = createDiagnostic(problem, location);

        // sub-problems
        if (problem.locations.length > 1) {
            let locationIdx = 1;

            for (const subLocation of problem.locations.slice(1)) {
                const diagnostic = createDiagnostic(problem, subLocation);
                diagnostic.relatedInformation = [
                    {
                        message: "root",
                        location: {
                            uri: vscode.Uri.file(filePath),
                            range: createRangeFromLocation(location),
                        },
                    },
                ];

                diagnostic.severity = vscode.DiagnosticSeverity.Error;

                const subFilePath = subLocation.fullpath;
                if (!diagnosticsByFile[subFilePath]) {
                    diagnosticsByFile[subFilePath] = [];
                }
                diagnosticsByFile[subFilePath].push(diagnostic);

                locationIdx += 1;
            }

            const otherLocations = problem.locations.slice(1);

            diagnostic.relatedInformation = otherLocations.map((location) => {
                return {
                    message: "from there!",
                    location: {
                        uri: vscode.Uri.file(location.fullpath),
                        range: createRangeFromLocation(location),
                    },
                };
            });
        }

        diagnosticsByFile[filePath].push(diagnostic);
    } catch (error) {
        log(error);
        log(JSON.stringify(problem));
        vscode.window.showErrorMessage(
            "Something went wrong while generating diagnostics"
        );
        revealLog();
    }
}

/**
 * Creates a VS Code diagnostic from a ck3tiger problem
 * @param problem The error entry containing message and severity
 * @param location The location where the problem occurs
 * @returns A VS Code diagnostic object
 */
function createDiagnostic(
    problem: ErrorEntry,
    location: TigerLocation
): vscode.Diagnostic {
    const range = createRangeFromLocation(location);

    // add tip info if exists
    const message = problem.info
        ? `${problem.message}\ntip: ${problem.info}`
        : problem.message;

    const severity = mapSeverityToDiagnosticSeverity(problem.severity);

    // Create a diagnostic for the current problem
    const diagnostic = new vscode.Diagnostic(range, message, severity);
    diagnostic.source = "ck3tiger";
    diagnostic.code = `${problem.confidence} ${problem.key}`;

    return diagnostic;
}

/**
 * Creates a VS Code Range from a ck3tiger location
 * Handles cases where line numbers or columns are null (file-level errors)
 * @param location The location information from ck3tiger
 * @returns A VS Code Range object pointing to the appropriate position
 */
function createRangeFromLocation(location: TigerLocation): vscode.Range {
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

/**
 * Maps ck3tiger severity levels to VS Code diagnostic severity levels
 * @param problem The error entry containing a severity level
 * @returns The appropriate VS Code DiagnosticSeverity
 */
function mapSeverityToDiagnosticSeverity(severity: TigerSeverity): vscode.DiagnosticSeverity {
    switch (severity) {
        case "tips":
            return vscode.DiagnosticSeverity.Hint;
        case "untidy":
            return vscode.DiagnosticSeverity.Information;
        case "warning":
            return vscode.DiagnosticSeverity.Warning;
        case "error":
        case "fatal":
            return vscode.DiagnosticSeverity.Error;
        default:
            return vscode.DiagnosticSeverity.Error;
    }
}
