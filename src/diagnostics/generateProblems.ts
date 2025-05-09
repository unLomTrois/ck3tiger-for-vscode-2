import * as vscode from "vscode";
import { getDiagnosticCollection } from "./collection";
import { log, revealLog } from "../logger";
import {
    TigerReport,
    TigerConfidence,
    confidenceLevelMap,
    TigerLocation,
    TigerSeverity,
} from "../types";

/**
 * Generates VS Code diagnostics from ck3tiger validation results
 * @param problems The parsed JSON output from ck3tiger
 * @returns The diagnostic collection with errors mapped to files
 */
export function generateDiagnostics(problems: TigerReport[]): vscode.DiagnosticCollection {
    log("Generating diagnostics for ", problems.length, " problems");

    // Filter problems by confidence level
    const filteredProblems = filterProblems(problems);
    log("Remaining problems: ", filteredProblems.length);

    // Create a map to collect diagnostics by file
    const diagnosticsByFile = new Map<string, vscode.Diagnostic[]>();
    
    // Process each problem into diagnostics
    for (const problem of filteredProblems) {
        processProblemIntoDiagnostics(problem, diagnosticsByFile);
    }
    
    // Update the diagnostic collection for each file
    const diagnosticCollection = getDiagnosticCollection();
    diagnosticCollection.clear();
    for (const [filePath, diagnostics] of diagnosticsByFile) {
        const fileUri = vscode.Uri.file(filePath);
        diagnosticCollection.set(fileUri, diagnostics);
    }

    return diagnosticCollection;
}

function filterProblems(problems: TigerReport[]): TigerReport[] {
    const filteredByConfidence = filterProblemsByConfidence(problems);
    const filteredByKey = filterProblemsByKey(filteredByConfidence);

    return filteredByKey;
}

/**
 * Filters problems based on their confidence level
 * @param problems Array of error entries from ck3tiger
 * @returns Filtered array of problems that meet the minimum confidence level
 */
function filterProblemsByConfidence(problems: TigerReport[]): TigerReport[] {
    const config = vscode.workspace.getConfiguration("ck3tiger");
    const minConfidenceStr = config.get<TigerConfidence>("minConfidence", "weak");
    const minConfidence = confidenceLevelMap[minConfidenceStr];

    log("Filtering problems by minimum confidence level: ", minConfidenceStr);

    const filteredByConfidence = problems.filter(problem => {
        const problemConfidence = confidenceLevelMap[problem.confidence];
        return problemConfidence >= minConfidence;
    });

    log("Remaining problems after confidence filter: ", filteredByConfidence.length);

    return filteredByConfidence;
}

function filterProblemsByKey(problems: TigerReport[]): TigerReport[] {
    log("Filtering problems by specific keys, skipping color problems");

    return problems.filter(problem => {
        // Skip color problems (not stable enough)
        if (problem.key === "colors") {
            return false;
        }

        return true;
    });
}

/**
 * Processes a single problem into VS Code diagnostics
 * Handles both primary locations and related sub-locations
 * @param problem The error entry to process
 * @param diagnosticsByFile The map of file paths to diagnostics arrays to update
 */
function processProblemIntoDiagnostics(
    problem: TigerReport,
    diagnosticsByFile: Map<string, vscode.Diagnostic[]>
): void {
    try {
        const primaryLocation = problem.locations[0];
        const primaryFilePath = primaryLocation.fullpath;
        
        // Process the primary diagnostic
        const primaryDiagnostic = createDiagnostic(problem, primaryLocation);
        
        // Add the primary diagnostic to the collection - get existing array or create a new one
        const primaryDiagnostics = diagnosticsByFile.get(primaryFilePath) || [];
        primaryDiagnostics.push(primaryDiagnostic);
        diagnosticsByFile.set(primaryFilePath, primaryDiagnostics);
        
        // Handle related locations if they exist
        if (problem.locations.length > 1) {
            processRelatedLocations(problem, primaryLocation, primaryDiagnostic, diagnosticsByFile);
        }
    } catch (error) {
        handleProcessingError(error, problem);
    }
}

/**
 * Processes related locations for a problem, creating diagnostics for each
 * @param problem The original problem
 * @param primaryLocation The primary location of the problem
 * @param primaryDiagnostic The diagnostic for the primary location
 * @param diagnosticsByFile The map to update with new diagnostics
 */
function processRelatedLocations(
    problem: TigerReport,
    primaryLocation: TigerLocation,
    primaryDiagnostic: vscode.Diagnostic,
    diagnosticsByFile: Map<string, vscode.Diagnostic[]>
): void {
    const primaryFilePath = primaryLocation.fullpath;
    const relatedLocations = problem.locations.slice(1);
    
    // Add related information to the primary diagnostic
    primaryDiagnostic.relatedInformation = relatedLocations.map((location) => ({
        message: "from there!",
        location: {
            uri: vscode.Uri.file(location.fullpath),
            range: createRangeFromLocation(location),
        },
    }));
    
    // Create diagnostics for each related location
    for (const subLocation of relatedLocations) {
        const subDiagnostic = createDiagnostic(problem, subLocation);
        
        // Link back to the primary location
        subDiagnostic.relatedInformation = [{
            message: "root",
            location: {
                uri: vscode.Uri.file(primaryFilePath),
                range: createRangeFromLocation(primaryLocation),
            },
        }];
        
        subDiagnostic.severity = vscode.DiagnosticSeverity.Error;
        
        const subFilePath = subLocation.fullpath;
        
        // Get existing diagnostics or create a new array
        const subDiagnostics = diagnosticsByFile.get(subFilePath) || [];
        subDiagnostics.push(subDiagnostic);
        diagnosticsByFile.set(subFilePath, subDiagnostics);
    }
}

/**
 * Handles errors that occur during problem processing
 * @param error The error that occurred
 * @param problem The problem being processed when the error occurred
 */
function handleProcessingError(error: unknown, problem: TigerReport): void {
    log(error);
    log(JSON.stringify(problem));
    vscode.window.showErrorMessage(
        "Something went wrong while generating diagnostics"
    );
    revealLog();
}

/**
 * Creates a VS Code diagnostic from a ck3tiger problem
 * @param problem The error entry containing message and severity
 * @param location The location where the problem occurs
 * @returns A VS Code diagnostic object
 */
function createDiagnostic(
    problem: TigerReport,
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
 * @param severity The severity level from ck3tiger
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
