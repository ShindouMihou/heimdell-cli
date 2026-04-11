import type { CIConfig } from "../config.ts";
import type { CIReporter } from "../reporter.ts";
import { createHeimdellClient } from "../../api/client.ts";

export async function ciListBundles(config: CIConfig, reporter: CIReporter): Promise<void> {
    reporter.stepStart("list_bundles");

    try {
        const client = createHeimdellClient();
        const result = await client.bundles.list(config.tag);

        if (result.statusCode !== 200 || !result.data) {
            reporter.stepEnd("list_bundles", "error");
            reporter.failure(
                "LIST_FAILED",
                `Failed to list bundles: ${(result.data as any)?.error ?? `Unknown error (Status ${result.statusCode})`}`
            );
            process.exit(2);
        }

        const bundles = result.data.map((b) => ({
            ...b,
            status: b.is_disposed ? "ROLLED BACK" : "AVAILABLE",
        }));

        reporter.stepEnd("list_bundles", "ok");
        reporter.success({ bundles });
        process.exit(0);
    } catch (e) {
        reporter.stepEnd("list_bundles", "error");
        reporter.failure(
            "LIST_FAILED",
            `Failed to list bundles: ${e instanceof Error ? e.message : String(e)}`
        );
        process.exit(2);
    }
}
