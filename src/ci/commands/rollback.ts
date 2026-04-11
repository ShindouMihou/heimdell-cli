import type { CIConfig } from "../config.ts";
import type { CIReporter } from "../reporter.ts";
import { createHeimdellClient } from "../../api/client.ts";

export async function ciRollback(config: CIConfig, reporter: CIReporter): Promise<void> {
    reporter.stepStart("rollback");

    try {
        const client = createHeimdellClient();
        const result = await client.bundles.rollback({ tag: config.tag });

        if (result.statusCode < 200 || result.statusCode >= 300) {
            reporter.stepEnd("rollback", "error");
            reporter.failure(
                "ROLLBACK_FAILED",
                `Failed to rollback: ${(result.data as any)?.error ?? `Unknown error (Status ${result.statusCode})`}`
            );
            process.exit(2);
        }

        reporter.stepEnd("rollback", "ok");
        reporter.success({
            disposed_bundle: result.data?.disposed_bundle,
        });
        process.exit(0);
    } catch (e) {
        reporter.stepEnd("rollback", "error");
        reporter.failure(
            "ROLLBACK_FAILED",
            `Failed to rollback: ${e instanceof Error ? e.message : String(e)}`
        );
        process.exit(2);
    }
}
