import * as vscode from "vscode";
import { getDiagnosticCollection } from "./collection";
import { log, revealLog } from "../logger";
import {
    confidenceLevels,
    ErrorEntry,
    TigerConfidence,
    TigerLocation,
} from "../types";

export function generateProblems(log_data: ErrorEntry[]) {
    const diagnosticCollection = getDiagnosticCollection();

    diagnosticCollection.clear();

    const diagnosticsByFile = handleProblems(log_data);

    // Update the diagnostic collection for each file
    for (const [filePath, diagnostics] of Object.entries(diagnosticsByFile)) {
        const fileUri = vscode.Uri.file(filePath);
        diagnosticCollection.set(fileUri, diagnostics);
    }

    return diagnosticCollection;
}

type DiagnosticsByFile = { [filePath: string]: vscode.Diagnostic[] };

function handleProblems(problems: ErrorEntry[]): DiagnosticsByFile {
    const diagnosticsByFile: DiagnosticsByFile = {};

    const config = vscode.workspace.getConfiguration("ck3tiger");

    const minConfidence =
        config.get<TigerConfidence>("minConfidence") ?? "weak";

    for (const problem of problems) {
        // Continue if problem's confidence is lower than minConfidence
        if (
            confidenceLevels.indexOf(problem.confidence) <
            confidenceLevels.indexOf(minConfidence)
        ) {
            continue;
        }

        handleProblem(problem, diagnosticsByFile);
    }

    return diagnosticsByFile;
}

function handleProblem(
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
                            range: setRange(location),
                        },
                    },
                ];
                // const otherLocations = problem.locations.slice(locationIdx+1);
                // diagnostic.relatedInformation.push(
                //     ...otherLocations.map((location) => {
                //         return {
                //             message: "from there2!",
                //             location: {
                //                 uri: vscode.Uri.file(location.fullpath),
                //                 range: setRange(location),
                //             },
                //         };
                //     })
                // );

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
                        range: setRange(location),
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

function createDiagnostic(
    problem: ErrorEntry,
    location: TigerLocation
): vscode.Diagnostic {
    let message = problem.message;
    // add tip info if exists
    if (problem.info) {
        message = `${message}\ntip: ${problem.info}`;
    }

    const range = setRange(location);
    const severity = setSeverity(problem);

    // Create a diagnostic for the current problem
    const diagnostic = new vscode.Diagnostic(range, message, severity);
    diagnostic.source = "ck3tiger";
    diagnostic.code = `${problem.confidence} ${problem.key}`;

    return diagnostic;
}

function setRange(location: TigerLocation): vscode.Range {
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

function setSeverity(problem: ErrorEntry): vscode.DiagnosticSeverity {
    switch (problem.severity) {
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
