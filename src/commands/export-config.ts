import type { Argv } from "yargs";
import fs from "node:fs";
import { password } from "@inquirer/prompts";
import { sanitizeEnvironmentName, validateEnvironmentName } from "../utils/environment.ts";
import { isCredentialsEncrypted, decryptCredentialsFile } from "../utils/encryption.ts";

type ExportedConfig = {
    baseUrl: string;
    username: string;
    password: string;
    tag: string;
    platforms: ("android" | "ios")[];
    environment?: string;
};

function buildConfig(raw: Record<string, unknown>, environment: string): ExportedConfig {
    const missing: string[] = [];
    for (const field of ["baseUrl", "username", "password", "tag", "platforms"]) {
        if (raw[field] == null) missing.push(field);
    }
    if (missing.length > 0) {
        throw new Error(`Credentials file is missing required fields: ${missing.join(", ")}`);
    }

    const platforms = raw.platforms as unknown;
    if (!Array.isArray(platforms) || platforms.length === 0) {
        throw new Error("Credentials 'platforms' must be a non-empty array.");
    }
    for (const p of platforms) {
        if (p !== "android" && p !== "ios") {
            throw new Error(`Invalid platform "${p}". Expected "android" or "ios".`);
        }
    }

    return {
        baseUrl: raw.baseUrl as string,
        username: raw.username as string,
        password: raw.password as string,
        tag: raw.tag as string,
        platforms: platforms as ("android" | "ios")[],
        environment: (raw.environment as string | undefined) ?? environment,
    };
}

export const useExportConfigCommand = (yargs: Argv) => {
    yargs.command(
        "export:config <environment>",
        "Decrypts a stored environment and prints a HEIMDELL_CONFIG JSON suitable for CI/CD pipelines.",
        (yargs) => {
            yargs.positional("environment", {
                type: "string",
                alias: "e",
                describe: "The environment to export (e.g. development, staging, production).",
            });
            yargs.option("key", {
                type: "string",
                alias: "k",
                describe: "Encryption key for encrypted credentials. If omitted, you will be prompted interactively.",
            });
            yargs.option("pretty", {
                type: "boolean",
                default: false,
                describe: "Pretty-print the JSON output instead of emitting a compact single line.",
            });
            yargs.option("export", {
                type: "boolean",
                default: false,
                describe: "Emit a shell-compatible 'export HEIMDELL_CONFIG=...' statement instead of raw JSON.",
            });
            yargs.check((argv) => {
                if (argv.environment) {
                    validateEnvironmentName(argv.environment as string);
                }
                return true;
            });
            yargs.demandOption(["environment"], "You must provide an environment to export.");
        },
        async function (args) {
            const rawEnv = args.environment as string;
            const sanitized = sanitizeEnvironmentName(rawEnv);
            if (!sanitized) {
                process.stderr.write("Invalid environment name. Use only letters, numbers, and underscores.\n");
                process.exit(1);
            }

            const credentialsPath = `.heimdell/${sanitized}/credentials.json`;
            if (!fs.existsSync(credentialsPath)) {
                process.stderr.write(
                    `No credentials found for environment "${sanitized}" at ${credentialsPath}.\n` +
                    `Run 'heimdell login -e ${rawEnv}' first.\n`
                );
                process.exit(1);
            }

            let rawCredentials: Record<string, unknown>;
            try {
                if (isCredentialsEncrypted(credentialsPath)) {
                    let key = (args.key as string | undefined) ?? process.env.HEIMDELL_ENCRYPTION_KEY;
                    if (!key) {
                        if (!process.stdin.isTTY) {
                            process.stderr.write(
                                "Credentials are encrypted. Provide the key via --key <value> or the HEIMDELL_ENCRYPTION_KEY environment variable when running non-interactively.\n"
                            );
                            process.exit(1);
                        }
                        key = await password({
                            message: `Enter encryption key for environment "${sanitized}":`,
                            mask: "*",
                        });
                    }
                    rawCredentials = decryptCredentialsFile(credentialsPath, key);
                } else {
                    const content = fs.readFileSync(credentialsPath, "utf8");
                    rawCredentials = JSON.parse(content);
                }
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                if (message.includes("Invalid encryption key")) {
                    process.stderr.write("Invalid encryption key.\n");
                    process.exit(2);
                }
                process.stderr.write(`Failed to read credentials: ${message}\n`);
                process.exit(1);
            }

            let config: ExportedConfig;
            try {
                config = buildConfig(rawCredentials, sanitized);
            } catch (e) {
                process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
                process.exit(1);
            }

            const json = args.pretty
                ? JSON.stringify(config, null, 2)
                : JSON.stringify(config);

            if (args.export) {
                const escaped = json.replace(/'/g, "'\\''");
                process.stdout.write(`export HEIMDELL_CONFIG='${escaped}'\n`);
            } else {
                process.stdout.write(json + "\n");
            }
        }
    );
};
