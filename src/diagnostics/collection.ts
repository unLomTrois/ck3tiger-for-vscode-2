import * as vscode from "vscode";

let globalDiagnosticCollection: vscode.DiagnosticCollection;

export function initDiagnosticCollection(): vscode.DiagnosticCollection {
    globalDiagnosticCollection =
        vscode.languages.createDiagnosticCollection("ck3tiger");

    return globalDiagnosticCollection;
}

export function getDiagnosticCollection(): vscode.DiagnosticCollection {
    if (globalDiagnosticCollection) {
        return globalDiagnosticCollection;
    }

    return initDiagnosticCollection();
}
