import type { CIConfig } from "../config.ts";
import type { CIReporter } from "../reporter.ts";
import { createHeimdellClient } from "../../api/client.ts";

export async function ciSetForceUpgrade(
    _config: CIConfig,
    bundleId: string,
    enabled: boolean,
    reporter: CIReporter
): Promise<void> {
    reporter.stepStart("set_force_upgrade");

    try {
        const client = createHeimdellClient();
        const result = await client.bundles.setForceUpgrade({ bundleId, enabled });

        if (result.statusCode < 200 || result.statusCode >= 300) {
            reporter.stepEnd("set_force_upgrade", "error");
            reporter.failure(
                "SET_FORCE_UPGRADE_FAILED",
                `Failed to update force-upgrade flag: ${(result.data as { error?: string } | null)?.error ?? `Unknown error (Status ${result.statusCode})`}`
            );
            process.exit(6);
        }

        reporter.stepEnd("set_force_upgrade", "ok");
        const bundle = result.data?.bundle;
        reporter.success({
            bundle: bundle ? { id: bundle.id, version: bundle.version, tag: bundle.tag } : undefined,
            force_upgrade: enabled,
        });
        process.exit(0);
    } catch (e) {
        reporter.stepEnd("set_force_upgrade", "error");
        reporter.failure(
            "SET_FORCE_UPGRADE_FAILED",
            `Failed to update force-upgrade flag: ${e instanceof Error ? e.message : String(e)}`
        );
        process.exit(6);
    }
}
