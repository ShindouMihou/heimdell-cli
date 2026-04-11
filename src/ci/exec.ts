import { spawn } from "node:child_process";
import type { CIReporter } from "./reporter.ts";

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function execCommand(
    command: string,
    reporter: CIReporter,
    stepName: string
): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
        const child = spawn(command, [], {
            shell: true,
            stdio: "pipe",
        });

        let stdout = "";
        let stderr = "";

        const timeout = setTimeout(() => {
            child.kill("SIGTERM");
            reporter.progress(stepName, "Command timed out after 10 minutes");
        }, TIMEOUT_MS);

        child.stdout?.on("data", (data: Buffer) => {
            const text = data.toString();
            stdout += text;
            const lines = text.split("\n").filter((l: string) => l.trim());
            for (const line of lines) {
                reporter.progress(stepName, line);
            }
        });

        child.stderr?.on("data", (data: Buffer) => {
            const text = data.toString();
            stderr += text;
            const lines = text.split("\n").filter((l: string) => l.trim());
            for (const line of lines) {
                reporter.progress(stepName, line);
            }
        });

        child.on("close", (code) => {
            clearTimeout(timeout);
            resolve({ code: code ?? 1, stdout, stderr });
        });

        child.on("error", (err) => {
            clearTimeout(timeout);
            resolve({ code: 1, stdout, stderr: err.message });
        });
    });
}
