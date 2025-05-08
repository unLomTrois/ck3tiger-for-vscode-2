import type { Diagnostic } from "vscode";

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

export type TigerConfidence = "strong" | "reasonable" | "weak";

export const confidenceLevels: TigerConfidence[] = ["weak", "reasonable", "strong"];

export type ErrorEntry = {
    confidence: TigerConfidence;
    info: string | null;
    key: string;
    locations: TigerLocation[];
    message: string;
    severity: TigerSeverity;
};

export type DiagnosticsByFile = { [filePath: string]: Diagnostic[] };
