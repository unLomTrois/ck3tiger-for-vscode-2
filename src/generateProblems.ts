import * as vscode from "vscode";
import { getDiagnosticCollection } from "./collection";
import { log } from "./logger";
import { ErrorEntry, TigerLocation } from "./types";

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
    let diagnosticsByFile: DiagnosticsByFile = {};

    problems.forEach((problem) => {
        const d = handleProblem(problem, diagnosticsByFile);
    });

    return diagnosticsByFile;
}

function handleProblem(
    problem: ErrorEntry,
    diagnosticsByFile: DiagnosticsByFile
): DiagnosticsByFile | undefined {
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

        const diagnostic = handleLocation(problem, location);

        diagnosticsByFile[filePath].push(diagnostic);

        return diagnosticsByFile;
    } catch (error) {
        log(error);
        log(JSON.stringify(problem));
        vscode.window.showErrorMessage(
            "Something went wrong while generating diagnostics"
        );
        return;
    }
}

function handleLocation(
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
    diagnostic.code = problem.key;

    return diagnostic;
}

function setRange(location: TigerLocation): vscode.Range {
    // if error is for the whole file (like encoding errors, match the whole first line)
    if (location.linenr === null || location.column === null) {
        return new vscode.Range(0, 0, 0, 0);
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
    let severity;

    switch (problem.severity) {
    case "tips":
        severity = vscode.DiagnosticSeverity.Hint;
        break;
    case "untidy":
        severity = vscode.DiagnosticSeverity.Information;
        break;
    case "warning":
        severity = vscode.DiagnosticSeverity.Warning;
        break;
    case "error":
        severity = vscode.DiagnosticSeverity.Error;
        break;
    case "fatal":
        severity = vscode.DiagnosticSeverity.Error;
        break;
    default:
        severity = vscode.DiagnosticSeverity.Error;
        break;
    }

    return severity;
}
