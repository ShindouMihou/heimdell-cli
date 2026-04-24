import fs from "node:fs";

export type CIEventType = "step_start" | "step_end" | "progress" | "result" | "error" | "warning";

export type CIEvent = {
    type: CIEventType;
    timestamp: string;
    step?: string;
    status?: "ok" | "error" | "skipped";
    message?: string;
    data?: Record<string, unknown>;
};

export type CIResult = {
    success: boolean;
    command: string;
    duration_ms: number;
    bundle?: { id: string; version: string; tag: string };
    platforms?: string[];
    bundles?: unknown[];
    disposed_bundle?: unknown;
    force_upgrade?: boolean;
    error?: { code: string; message: string; details?: string };
};

export class CIReporter {
    private startTime: number;
    private isGitHubActions: boolean;

    constructor(private command: string) {
        this.startTime = Date.now();
        this.isGitHubActions = process.env.GITHUB_ACTIONS === "true";
    }

    private emit(event: CIEvent): void {
        process.stdout.write(JSON.stringify(event) + "\n");
    }

    private annotation(message: string): void {
        if (this.isGitHubActions) {
            process.stderr.write(message + "\n");
        }
    }

    stepStart(name: string): void {
        this.emit({
            type: "step_start",
            timestamp: new Date().toISOString(),
            step: name,
        });
        this.annotation(`::group::${name}`);
    }

    stepEnd(name: string, status: "ok" | "error" | "skipped"): void {
        this.emit({
            type: "step_end",
            timestamp: new Date().toISOString(),
            step: name,
            status,
        });
        this.annotation("::endgroup::");
    }

    progress(step: string, message: string, data?: Record<string, unknown>): void {
        this.emit({
            type: "progress",
            timestamp: new Date().toISOString(),
            step,
            message,
            data,
        });
    }

    error(code: string, message: string, details?: string): void {
        this.emit({
            type: "error",
            timestamp: new Date().toISOString(),
            data: { code, message, details },
        });
        this.annotation(`::error title=${code}::${message}`);
    }

    warning(message: string): void {
        this.emit({
            type: "warning",
            timestamp: new Date().toISOString(),
            message,
        });
        this.annotation(`::warning::${message}`);
    }

    result(result: CIResult): void {
        this.emit({
            type: "result",
            timestamp: new Date().toISOString(),
            data: result as unknown as Record<string, unknown>,
        });

        if (this.isGitHubActions && result.success) {
            if (result.bundle) {
                this.writeGitHubOutput("bundle_id", result.bundle.id);
                this.writeGitHubOutput("bundle_version", result.bundle.version);
                this.writeGitHubOutput("bundle_tag", result.bundle.tag);
            }
            this.writeGitHubOutput("success", "true");
        } else if (this.isGitHubActions) {
            this.writeGitHubOutput("success", "false");
        }
    }

    success(data?: Partial<CIResult>): CIResult {
        const result: CIResult = {
            success: true,
            command: this.command,
            duration_ms: Date.now() - this.startTime,
            ...data,
        };
        this.result(result);
        return result;
    }

    failure(code: string, message: string, details?: string): CIResult {
        this.error(code, message, details);
        const result: CIResult = {
            success: false,
            command: this.command,
            duration_ms: Date.now() - this.startTime,
            error: { code, message, details },
        };
        this.result(result);
        return result;
    }

    private writeGitHubOutput(key: string, value: string): void {
        const outputFile = process.env.GITHUB_OUTPUT;
        if (outputFile) {
            fs.appendFileSync(outputFile, `${key}=${value}\n`);
        }
    }
}
