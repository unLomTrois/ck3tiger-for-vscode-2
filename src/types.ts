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
export type ErrorEntry = {
    confidence: string;
    info: string | null;
    key: string;
    locations: TigerLocation[];
    message: string;
    severity: TigerSeverity;
};
