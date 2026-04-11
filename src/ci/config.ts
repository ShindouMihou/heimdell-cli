import * as v from "valibot";

const CIConfigSchema = v.object({
    baseUrl: v.pipe(v.string(), v.url()),
    username: v.pipe(v.string(), v.minLength(1)),
    password: v.pipe(v.string(), v.minLength(1)),
    tag: v.pipe(v.string(), v.minLength(1)),
    platforms: v.pipe(
        v.array(v.picklist(["android", "ios"])),
        v.minLength(1)
    ),
    environment: v.optional(v.string()),
});

export type CIConfig = v.InferOutput<typeof CIConfigSchema>;

export function loadCIConfig(): CIConfig {
    const raw = process.env.HEIMDELL_CONFIG;
    if (!raw) {
        process.stderr.write(
            JSON.stringify({
                type: "error",
                timestamp: new Date().toISOString(),
                data: {
                    code: "MISSING_CONFIG",
                    message: "HEIMDELL_CONFIG environment variable is not set. Set it to a JSON string with: baseUrl, username, password, tag, platforms.",
                },
            }) + "\n"
        );
        process.exit(1);
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        process.stderr.write(
            JSON.stringify({
                type: "error",
                timestamp: new Date().toISOString(),
                data: {
                    code: "INVALID_JSON",
                    message: "HEIMDELL_CONFIG is not valid JSON.",
                },
            }) + "\n"
        );
        process.exit(1);
    }

    const result = v.safeParse(CIConfigSchema, parsed);
    if (!result.success) {
        const issues = result.issues.map((issue) => ({
            path: issue.path?.map((p) => p.key).join(".") ?? "",
            message: issue.message,
        }));
        process.stderr.write(
            JSON.stringify({
                type: "error",
                timestamp: new Date().toISOString(),
                data: {
                    code: "INVALID_CONFIG",
                    message: "HEIMDELL_CONFIG validation failed.",
                    details: JSON.stringify(issues),
                },
            }) + "\n"
        );
        process.exit(1);
    }

    const config = result.output;

    globalThis.credentials = {
        baseUrl: config.baseUrl,
        username: config.username,
        password: config.password,
        tag: config.tag,
        platforms: config.platforms,
        environment: config.environment,
    };

    globalThis.ciMode = true;

    return config;
}
