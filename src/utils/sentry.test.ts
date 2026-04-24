import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { checkSentryAvailability } from "./sentry.ts";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("checkSentryAvailability", () => {
    let tempDir: string;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        // Create a temporary directory for testing
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sentry-test-"));
        
        // Save original environment variables
        originalEnv = { ...process.env };
        
        // Clear Sentry-related environment variables
        delete process.env.SENTRY_ORG;
        delete process.env.SENTRY_PROJECT;
        delete process.env.SENTRY_AUTH_TOKEN;
    });

    afterEach(() => {
        // Restore original environment variables
        process.env = originalEnv;
        
        // Clean up temporary directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it("should return false if package.json does not exist", async () => {
        const result = await checkSentryAvailability(tempDir);
        expect(result).toBe(false);
    });

    it("should return false if Sentry dependencies are missing", async () => {
        // Create package.json without Sentry dependencies
        fs.writeFileSync(
            path.join(tempDir, "package.json"),
            JSON.stringify({
                name: "test-app",
                dependencies: {}
            })
        );

        const result = await checkSentryAvailability(tempDir);
        expect(result).toBe(false);
    });

    it("should return false if @sentry/react-native exists but no CLI", async () => {
        fs.writeFileSync(
            path.join(tempDir, "package.json"),
            JSON.stringify({
                name: "test-app",
                dependencies: {
                    "@sentry/react-native": "^5.0.0"
                }
            })
        );

        const result = await checkSentryAvailability(tempDir);
        expect(result).toBe(false);
    });

    it("should return false if CLI exists but no configuration", async () => {
        fs.writeFileSync(
            path.join(tempDir, "package.json"),
            JSON.stringify({
                name: "test-app",
                dependencies: {
                    "@sentry/react-native": "^5.0.0"
                },
                devDependencies: {
                    "@sentry/cli": "^2.0.0"
                }
            })
        );

        const result = await checkSentryAvailability(tempDir);
        expect(result).toBe(false);
    });

    it("should return true with env config", async () => {
        fs.writeFileSync(
            path.join(tempDir, "package.json"),
            JSON.stringify({
                name: "test-app",
                dependencies: {
                    "@sentry/react-native": "^5.0.0"
                },
                devDependencies: {
                    "@sentry/cli": "^2.0.0"
                }
            })
        );

        // Set environment variables
        process.env.SENTRY_ORG = "test-org";
        process.env.SENTRY_PROJECT = "test-project";

        const result = await checkSentryAvailability(tempDir);
        expect(result).toBe(true);
    });

    it("should return true with sentry.properties config", async () => {
        fs.writeFileSync(
            path.join(tempDir, "package.json"),
            JSON.stringify({
                name: "test-app",
                dependencies: {
                    "@sentry/react-native": "^5.0.0"
                },
                devDependencies: {
                    "@sentry/cli": "^2.0.0"
                }
            })
        );

        // Create sentry.properties
        fs.writeFileSync(
            path.join(tempDir, "sentry.properties"),
            "defaults.org=test-org\ndefaults.project=test-project\n"
        );

        const result = await checkSentryAvailability(tempDir);
        expect(result).toBe(true);
    });

    it("should return true with .sentryclirc config", async () => {
        fs.writeFileSync(
            path.join(tempDir, "package.json"),
            JSON.stringify({
                name: "test-app",
                dependencies: {
                    "@sentry/react-native": "^5.0.0"
                },
                devDependencies: {
                    "@sentry/cli": "^2.0.0"
                }
            })
        );

        // Create .sentryclirc
        fs.writeFileSync(
            path.join(tempDir, ".sentryclirc"),
            "[defaults]\norg=test-org\nproject=test-project\n"
        );

        const result = await checkSentryAvailability(tempDir);
        expect(result).toBe(true);
    });

    it("should return true with android/sentry.properties config", async () => {
        fs.writeFileSync(
            path.join(tempDir, "package.json"),
            JSON.stringify({
                name: "test-app",
                dependencies: {
                    "@sentry/react-native": "^5.0.0"
                },
                devDependencies: {
                    "@sentry/cli": "^2.0.0"
                }
            })
        );

        // Create android directory and sentry.properties
        fs.mkdirSync(path.join(tempDir, "android"));
        fs.writeFileSync(
            path.join(tempDir, "android", "sentry.properties"),
            "defaults.org=test-org\ndefaults.project=test-android\n"
        );

        const result = await checkSentryAvailability(tempDir);
        expect(result).toBe(true);
    });

    it("should return true with ios/sentry.properties config", async () => {
        fs.writeFileSync(
            path.join(tempDir, "package.json"),
            JSON.stringify({
                name: "test-app",
                dependencies: {
                    "@sentry/react-native": "^5.0.0"
                },
                devDependencies: {
                    "@sentry/cli": "^2.0.0"
                }
            })
        );

        // Create ios directory and sentry.properties
        fs.mkdirSync(path.join(tempDir, "ios"));
        fs.writeFileSync(
            path.join(tempDir, "ios", "sentry.properties"),
            "defaults.org=test-org\ndefaults.project=test-ios\n"
        );

        const result = await checkSentryAvailability(tempDir);
        expect(result).toBe(true);
    });

    it("should return true when CLI is installed in node_modules", async () => {
        fs.writeFileSync(
            path.join(tempDir, "package.json"),
            JSON.stringify({
                name: "test-app",
                dependencies: {
                    "@sentry/react-native": "^5.0.0"
                }
            })
        );

        // Create node_modules/@sentry/cli directory
        fs.mkdirSync(path.join(tempDir, "node_modules", "@sentry", "cli"), { recursive: true });
        fs.writeFileSync(
            path.join(tempDir, "node_modules", "@sentry", "cli", "package.json"),
            JSON.stringify({ name: "@sentry/cli" })
        );

        // Set environment variables for config
        process.env.SENTRY_ORG = "test-org";
        process.env.SENTRY_PROJECT = "test-project";

        const result = await checkSentryAvailability(tempDir);
        expect(result).toBe(true);
    });

    it("should return true when Sentry is in dependencies (not devDependencies)", async () => {
        fs.writeFileSync(
            path.join(tempDir, "package.json"),
            JSON.stringify({
                name: "test-app",
                dependencies: {
                    "@sentry/react-native": "^5.0.0",
                    "@sentry/cli": "^2.0.0"
                }
            })
        );

        process.env.SENTRY_ORG = "test-org";
        process.env.SENTRY_PROJECT = "test-project";

        const result = await checkSentryAvailability(tempDir);
        expect(result).toBe(true);
    });

    it("should handle malformed package.json gracefully", async () => {
        fs.writeFileSync(
            path.join(tempDir, "package.json"),
            "{ invalid json"
        );

        const result = await checkSentryAvailability(tempDir);
        expect(result).toBe(false);
    });

    it("should handle missing directories gracefully", async () => {
        const nonExistentDir = path.join(tempDir, "non-existent");
        const result = await checkSentryAvailability(nonExistentDir);
        expect(result).toBe(false);
    });
});
