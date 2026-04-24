import fs from "node:fs";
import path from "node:path";
import type { CIConfig } from "../config.ts";
import type { CIReporter } from "../reporter.ts";
import type { CIFlags } from "../index.ts";
import { execCommand } from "../exec.ts";
import { validateRuleset } from "../../rulesets/executable.ts";
import { bundleAndroidScript, bundleIosScript } from "../../scripts/hermes.ts";
import { checkJsRuntime } from "../../scripts/runtime.ts";
import { createHeimdellClient } from "../../api/client.ts";
import { uploadBundleFile } from "../../api/resources/v1/upload.ts";
import { checkSentryAvailability, uploadSourceMapToSentry } from "../../utils/sentry.ts";
import type { Bundle } from "../../api/types/bundle.ts";

async function bundlePlatform(
    platform: "android" | "ios",
    runtime: ReturnType<typeof checkJsRuntime>,
    reporter: CIReporter
): Promise<void> {
    const stepName = `bundle_${platform}`;
    const script = platform === "android" ? bundleAndroidScript : bundleIosScript;

    reporter.stepStart(stepName);
    const command = script.using(runtime);
    const result = await execCommand(command, reporter, stepName);
    if (result.code !== 0) {
        reporter.stepEnd(stepName, "error");
        reporter.failure("BUNDLE_FAILED", `${platform} bundling failed`, result.stderr || result.stdout);
        process.exit(3);
    }
    reporter.stepEnd(stepName, "ok");
}

export async function ciPushUpdate(
    config: CIConfig,
    targetVersion: string,
    note: string | null,
    reporter: CIReporter,
    flags: CIFlags,
    forceUpgrade: boolean = false
): Promise<void> {
    if (forceUpgrade) {
        reporter.warning(
            "force-upgrade flag is set — this bundle will be marked as a mandatory upgrade for all users on older bundles for this version+tag."
        );
    }
    const runtime = checkJsRuntime();
    const isAndroid = config.platforms.includes("android");
    const isIos = config.platforms.includes("ios");

    // Step 1: Ruleset validation
    reporter.stepStart("ruleset_validation");
    try {
        const valid = await validateRuleset();
        if (!valid) {
            reporter.stepEnd("ruleset_validation", "error");
            reporter.failure("RULESET_FAILED", "Ruleset validation failed. Check your .heimdell/ruleset.json and .env configuration.");
            process.exit(4);
        }
        reporter.stepEnd("ruleset_validation", "ok");
    } catch (e) {
        reporter.stepEnd("ruleset_validation", "error");
        reporter.failure("RULESET_FAILED", `Ruleset validation error: ${e instanceof Error ? e.message : String(e)}`);
        process.exit(4);
    }

    // Steps 2-3: Bundle platforms (parallel or sequential)
    if (flags.parallel && isAndroid && isIos) {
        reporter.progress("bundling", "Running Android and iOS bundling in parallel");
        await Promise.all([
            bundlePlatform("android", runtime, reporter),
            bundlePlatform("ios", runtime, reporter),
        ]);
    } else {
        if (isAndroid) await bundlePlatform("android", runtime, reporter);
        if (isIos) await bundlePlatform("ios", runtime, reporter);
    }

    // Step 4: Checkups — verify bundle files exist
    reporter.stepStart("checkups");
    if (isAndroid && !fs.existsSync("dist/hermes.android.hbc.zip")) {
        reporter.stepEnd("checkups", "error");
        reporter.failure("CHECKUP_FAILED", "Android bundle file not found at dist/hermes.android.hbc.zip");
        process.exit(4);
    }
    if (isIos && !fs.existsSync("dist/hermes.ios.hbc.zip")) {
        reporter.stepEnd("checkups", "error");
        reporter.failure("CHECKUP_FAILED", "iOS bundle file not found at dist/hermes.ios.hbc.zip");
        process.exit(4);
    }
    reporter.stepEnd("checkups", "ok");

    // Step 5: Reserve bundle version
    reporter.stepStart("reserve_bundle");
    let bundle: Bundle;
    try {
        const client = createHeimdellClient();
        const reserve = await client.bundles.reserve({
            version: targetVersion,
            tag: config.tag,
            note: note ?? undefined,
            is_force_upgrade: forceUpgrade,
        });

        if (reserve.statusCode !== 200 || !reserve.data) {
            reporter.stepEnd("reserve_bundle", "error");
            reporter.failure(
                "RESERVE_FAILED",
                `Failed to reserve bundle version: ${reserve.data?.error ?? `Unknown error (Status ${reserve.statusCode})`}`
            );
            process.exit(5);
        }

        bundle = reserve.data;
        reporter.progress("reserve_bundle", `Reserved bundle ${bundle.id}`);
        reporter.stepEnd("reserve_bundle", "ok");
    } catch (e) {
        reporter.stepEnd("reserve_bundle", "error");
        reporter.failure("RESERVE_FAILED", `Failed to reserve bundle: ${e instanceof Error ? e.message : String(e)}`);
        process.exit(5);
    }

    // Step 6: Upload bundles
    reporter.stepStart("upload_bundles");
    try {
        await uploadBundleFile(
            bundle.id,
            isAndroid ? Bun.file("dist/hermes.android.hbc.zip") : undefined,
            isIos ? Bun.file("dist/hermes.ios.hbc.zip") : undefined
        );

        // Clean up local bundle files
        if (isAndroid) {
            await Bun.file("dist/hermes.android.hbc.zip").delete();
        }
        if (isIos) {
            await Bun.file("dist/hermes.ios.hbc.zip").delete();
        }

        reporter.stepEnd("upload_bundles", "ok");
    } catch (e) {
        reporter.stepEnd("upload_bundles", "error");
        reporter.failure("UPLOAD_FAILED", `Failed to upload bundles: ${e instanceof Error ? e.message : String(e)}`);
        process.exit(5);
    }

    // Step 7: Sentry sourcemaps (conditional)
    const sentryAvailable = await checkSentryAvailability(process.cwd());
    if (sentryAvailable) {
        reporter.stepStart("sentry_sourcemaps");
        const projectRoot = process.cwd();

        try {
            if (isAndroid && fs.existsSync("dist/sentry/index.android.bundle") && fs.existsSync("dist/sentry/index.android.bundle.map")) {
                await uploadSourceMapToSentry({
                    bundlePath: path.resolve("dist/sentry/index.android.bundle"),
                    sourceMapPath: path.resolve("dist/sentry/index.android.bundle.map"),
                    release: targetVersion,
                    platform: "android",
                    projectRoot,
                });
            }

            if (isIos && fs.existsSync("dist/sentry/main.ios.jsbundle") && fs.existsSync("dist/sentry/main.ios.jsbundle.map")) {
                await uploadSourceMapToSentry({
                    bundlePath: path.resolve("dist/sentry/main.ios.jsbundle"),
                    sourceMapPath: path.resolve("dist/sentry/main.ios.jsbundle.map"),
                    release: targetVersion,
                    platform: "ios",
                    projectRoot,
                });
            }

            // Clean up Sentry files
            if (fs.existsSync("dist/sentry")) {
                fs.rmSync("dist/sentry", { recursive: true });
            }

            reporter.stepEnd("sentry_sourcemaps", "ok");
        } catch (e) {
            reporter.stepEnd("sentry_sourcemaps", "error");
            reporter.warning(`Sentry sourcemap upload failed: ${e instanceof Error ? e.message : String(e)}`);
            // Sentry failure is non-fatal — continue
        }
    } else {
        reporter.warning("Sentry not configured, skipping sourcemap upload");
    }

    // Done
    reporter.success({
        bundle: { id: bundle.id, version: bundle.version, tag: bundle.tag },
        platforms: config.platforms,
    });
    process.exit(0);
}
