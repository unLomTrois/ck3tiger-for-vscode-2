import https from "https";
import fs from "fs";
import { URL } from "url";
import { log } from "../logger";
import { IncomingMessage } from "http";

function streamWithProgress(
    response: IncomingMessage,
    dest: string,
    totalBytes: number,
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        let downloadedBytes = 0;
        let lastLoggedPercentage = 0;

        if (isNaN(totalBytes) || totalBytes <= 0) {
            log("Total file size unknown. Downloading without progress information.");
        } else {
            log("Downloading: 0%");
        }

        response.on("data", (chunk) => {
            if (totalBytes > 0) {
                downloadedBytes += chunk.length;
                const percentage = Math.floor(
                    (downloadedBytes / totalBytes) * 100,
                );
                if (
                    percentage !== lastLoggedPercentage &&
                    percentage % 5 === 0
                ) {
                    lastLoggedPercentage = percentage;
                    log(`Downloading: ${percentage}%`);
                }
            }
        });

        const fileStream = fs.createWriteStream(dest);
        response.pipe(fileStream);

        fileStream.on("finish", () => {
            fileStream.close(() => {
                if (totalBytes > 0) {
                    log("Download Complete.");
                }
                resolve();
            });
        });

        fileStream.on("error", (err) => {
            fs.unlink(dest, () => reject(err));
        });

        response.on("error", (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

async function getResponse(url: URL): Promise<IncomingMessage> {
    const options = {
        headers: {
            "User-Agent": "Mozilla/5.0", // GitHub requires a User-Agent header
        },
    };

    return new Promise<IncomingMessage>((resolve, reject) => {
        const request = https.get(url, options, resolve);
        request.on("error", reject);
    });
}

/**
 * Custom wrapper to download files and track progress.
 */
export async function downloadFile(
    fileUrl: string,
    dest: string,
): Promise<void> {
    let currentUrl = new URL(fileUrl);
    let redirectCount = 0;
    const maxRedirects = 10;

    while (redirectCount < maxRedirects) {
        const response = await getResponse(currentUrl);
        const statusCode = response.statusCode;

        if (typeof statusCode !== "number") {
            throw new Error("Unable to determine status code");
        }

        if ([301, 302, 303, 307, 308].includes(statusCode)) {
            const location = response.headers.location;
            if (location) {
                currentUrl = new URL(location, currentUrl);
                redirectCount++;
                response.destroy(); // Consume response data to free up memory
            } else {
                response.destroy();
                throw new Error(
                    "Redirect status code received but no location header found",
                );
            }
        } else if (statusCode === 200) {
            const totalBytes = parseInt(
                response.headers["content-length"] || "0",
                10,
            );
            await streamWithProgress(response, dest, totalBytes);
            return;
        } else {
            const err = new Error(`Download failed with status code ${statusCode}`);
            response.destroy();
            throw err;
        }
    }

    throw new Error("Too many redirects");
}
