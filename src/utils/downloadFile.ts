import https from "https";
import fs from "fs";
import { URL } from "url";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { log } from "../logger";

const execPromise = promisify(exec);

export async function downloadAndExtract(
    fileUrl: string,
    destDir: string
): Promise<void> {
    const fileExtension = path.extname(fileUrl);
    const fileName =
        fileExtension === ".zip" ? "downloaded.zip" : "downloaded.tar.gz";
    const archivePath = path.join(destDir, fileName);

    await ensureDirectoryExists(destDir);
    await downloadFile(fileUrl, archivePath);
    log(`File downloaded as ${fileName}.`);

    await extractArchive(archivePath, destDir);
    log("File extracted successfully.");

    await deleteFile(archivePath);
    log("Archive file deleted successfully.");
}

async function ensureDirectoryExists(dir: string): Promise<void> {
    if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
        log(`Created directory: ${dir}`);
    }
}

async function downloadFile(fileUrl: string, dest: string): Promise<void> {
    const myURL = new URL(fileUrl);

    const options = {
        headers: {
            "User-Agent": "Mozilla/5.0", // GitHub requires a User-Agent header
        },
    };

    return new Promise<void>((resolve, reject) => {
        const request = https.get(myURL, options, (response) => {
            const statusCode = response.statusCode;

            if (typeof statusCode !== "number") {
                reject(new Error("Unable to determine status code"));
                return;
            }

            // Handle redirects
            if ([301, 302, 303, 307, 308].includes(statusCode)) {
                const location = response.headers.location;
                if (location) {
                    const redirectUrl = new URL(location, myURL);
                    downloadFile(redirectUrl.href, dest)
                        .then(() => resolve())
                        .catch((err) => reject(err));
                } else {
                    reject(
                        new Error(
                            "Redirect status code received but no location header found"
                        )
                    );
                }
                return;
            }

            // Handle non-200 status codes
            if (statusCode !== 200) {
                reject(
                    new Error(`Download failed with status code ${statusCode}`)
                );
                return;
            }

            // Retrieve total file size from headers
            const totalBytes = parseInt(
                response.headers["content-length"] || "0",
                10
            );
            let downloadedBytes = 0;
            let lastLoggedPercentage = 0;

            if (isNaN(totalBytes) || totalBytes === 0) {
                log(
                    "Total file size unknown. Downloading without progress information."
                );
            } else {
                log("Downloading: 0%");
            }

            // Listen to data events to track progress
            response.on("data", (chunk) => {
                downloadedBytes += chunk.length;
                if (totalBytes > 0) {
                    const percentage = Math.floor(
                        (downloadedBytes / totalBytes) * 100
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
        });

        request.on("error", (err) => {
            reject(err);
        });
    });
}

async function extractArchive(
    archivePath: string,
    destDir: string
): Promise<void> {
    const extension = path.extname(archivePath);

    try {
        if (extension === ".zip") {
            // Extract zip file
            await execPromise(`tar -xf "${archivePath}" -C "${destDir}"`);
        } else if (extension === ".gz" || extension === ".tar.gz") {
            // Extract tar.gz file
            await execPromise(`tar -xzf "${archivePath}" -C "${destDir}"`);
        } else {
            throw new Error("Unsupported file extension for extraction");
        }
    } catch (err) {
        throw new Error(`Extraction failed: ${(err as Error).message}`);
    }
}

async function deleteFile(filePath: string): Promise<void> {
    return fs.promises.unlink(filePath);
}
