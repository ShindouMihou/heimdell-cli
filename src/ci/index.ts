import { loadCIConfig } from "./config.ts";
import { CIReporter } from "./reporter.ts";
import { ciPushUpdate } from "./commands/push-update.ts";
import { ciListBundles } from "./commands/list-bundles.ts";
import { ciRollback } from "./commands/rollback.ts";
import { ciSetForceUpgrade } from "./commands/set-force-upgrade.ts";

export type CIFlags = {
    parallel: boolean;
};

const SUPPORTED_COMMANDS = ["push-update", "list-bundles", "rollback", "set-force-upgrade"] as const;

export function parseCIFlags(flagString: string): CIFlags {
    const parts = flagString.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    return {
        parallel: parts.includes("parallel"),
    };
}

export async function executeCIMode(command: string, args: Record<string, unknown>, flagString: string): Promise<never> {
    const config = loadCIConfig();
    const flags = parseCIFlags(flagString);
    const reporter = new CIReporter(command);

    switch (command) {
        case "push-update": {
            const targetVersion = args.targetVersion as string;
            if (!targetVersion) {
                reporter.failure("MISSING_ARG", "targetVersion is required for push-update");
                process.exit(1);
            }
            const note = (args.note as string) || null;
            const forceUpgrade = Boolean(args["force-upgrade"]);
            await ciPushUpdate(config, targetVersion, note, reporter, flags, forceUpgrade);
            break;
        }

        case "list-bundles":
            await ciListBundles(config, reporter);
            break;

        case "rollback":
            await ciRollback(config, reporter);
            break;

        case "set-force-upgrade": {
            const bundleId = args.bundleId as string;
            if (!bundleId) {
                reporter.failure("MISSING_ARG", "bundleId is required for set-force-upgrade");
                process.exit(1);
            }
            const enabled = !(args.disable as boolean);
            await ciSetForceUpgrade(config, bundleId, enabled, reporter);
            break;
        }

        default:
            reporter.failure(
                "UNSUPPORTED_COMMAND",
                `Command '${command}' is not supported in CI mode. Supported commands: ${SUPPORTED_COMMANDS.join(", ")}`
            );
            process.exit(1);
    }

    // CI commands call process.exit() themselves, but as a safety net:
    process.exit(0);
}
