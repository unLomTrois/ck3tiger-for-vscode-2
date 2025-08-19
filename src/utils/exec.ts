import { exec, ExecOptions } from "child_process";

export function execAsync(command: string, options?: ExecOptions): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        exec(command, options, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
            }
        });
    });
}
