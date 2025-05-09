import { createHash } from "crypto";
import * as fs from "fs/promises";
import { log } from "../logger";

/**
 * Calculates MD5 hash of a file's content
 */
export async function calculateFileHash(filePath: string): Promise<string> {
    try {
        const fileContent = await fs.readFile(filePath);
        const hash = createHash('md5').update(fileContent).digest('hex');
        return hash;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error calculating file hash: ${errorMessage}`);
        return `error-${Date.now()}`;
    }
}
