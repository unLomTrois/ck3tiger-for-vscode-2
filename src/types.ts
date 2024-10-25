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

type TigerSeverity = "tips" | "untidy" | "warning" | "error" | "fatal";

type TigerConfidence = "strong" | "reasonable" | "weak";

export type ErrorEntry = {
    confidence: TigerConfidence;
    info: string | null;
    key: string;
    locations: TigerLocation[];
    message: string;
    severity: TigerSeverity;
};
