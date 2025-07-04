import * as vscode from "vscode";
import { log } from "../logger";
import {
    TigerReport,
    TigerConfidence,
    confidenceLevelMap,
} from "../types";

/**
 * Applies all filtering criteria to the problems
 * @param problems The original problems array
 * @returns Filtered array of problems
 */
export function filterProblems(problems: TigerReport[]): TigerReport[] {
    const filteredByConfidence = filterProblemsByConfidence(problems);
    const filteredByKey = filterProblemsByKey(filteredByConfidence);

    return filteredByKey;
}

/**
 * Filters problems based on their confidence level
 * @param problems Array of error entries from tiger
 * @returns Filtered array of problems that meet the minimum confidence level
 */
export function filterProblemsByConfidence(problems: TigerReport[]): TigerReport[] {
    const config = vscode.workspace.getConfiguration("tiger");
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

/**
 * Filters problems based on their key
 * @param problems Array of error entries
 * @returns Filtered array with problematic keys removed
 */
export function filterProblemsByKey(problems: TigerReport[]): TigerReport[] {
    log("Filtering problems by specific keys, skipping color problems");

    return problems.filter(problem => {
        // Skip color problems (not stable enough)
        if (problem.key === "colors") {
            return false;
        }

        return true;
    });
} 