import * as vscode from "vscode";

export type TigerLocation = {
    column: number;
    from: string;
    fullpath: string;
    length: number | null;
    line: string;
    linenr: number;
    path: string;
    tag: string | null;
};

export type TigerSeverity = "tips" | "untidy" | "warning" | "error" | "fatal";

export type TigerConfidence = "weak" | "reasonable" | "strong";

// Map string values received from the API to our enum values
export const confidenceLevelMap: Record<TigerConfidence, number> = {
    "weak": 0,
    "reasonable": 1,
    "strong": 2
};

// Map TigerSeverity values to VS Code DiagnosticSeverity
export const severityMap: Record<TigerSeverity, vscode.DiagnosticSeverity> = {
    "tips": vscode.DiagnosticSeverity.Hint,
    "untidy": vscode.DiagnosticSeverity.Information,
    "warning": vscode.DiagnosticSeverity.Warning,
    "error": vscode.DiagnosticSeverity.Error,
    "fatal": vscode.DiagnosticSeverity.Error
};

/**
 * Represents a single report from ck3tiger.
 * It is not called an error, problem, etc. because besides errors, it also includes tips, untidy, warnings, etc.
 * Each file can have multiple reports.
 */
export type TigerReport = {
    confidence: TigerConfidence;
    info: string | null;
    key: string;
    locations: TigerLocation[];
    message: string;
    severity: TigerSeverity;
};

export type VscodeProgress = vscode.Progress<{ message?: string; increment?: number; }>;

export const supportedGames: string[] = ["ck3", "vic3", "imperator"];
