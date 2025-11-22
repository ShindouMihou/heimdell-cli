import fs from "node:fs";
import path from "node:path";
import {spawn} from "node:child_process";

export interface SentryUploadOptions {
    bundlePath: string;
    sourceMapPath: string;
    release: string;
    platform: "android" | "ios";
    projectRoot: string;
}

export async function checkSentryAvailability(projectRoot: string): Promise<boolean> {
    try {
        const packageJsonPath = path.join(projectRoot, "package.json");
        if (!fs.existsSync(packageJsonPath)) {
            return false;
        }
        
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        const hasSentryDep = !!(
            (packageJson.dependencies && packageJson.dependencies["@sentry/react-native"]) ||
            (packageJson.devDependencies && packageJson.devDependencies["@sentry/react-native"])
        );
        
        // Also check if @sentry/cli is available
        const hasCliDep = !!(
            (packageJson.dependencies && packageJson.dependencies["@sentry/cli"]) ||
            (packageJson.devDependencies && packageJson.devDependencies["@sentry/cli"])
        );
        
        const hasCliInstalled = hasCliDep || fs.existsSync(path.join(projectRoot, "node_modules", "@sentry", "cli"));
        
        // Check for Sentry configuration
        const hasEnvConfig = !!(process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);
        const hasSentryCliRc = fs.existsSync(path.join(projectRoot, ".sentryclirc"));
        const hasSentryProperties = fs.existsSync(path.join(projectRoot, "sentry.properties"));
        const hasAndroidSentryProperties = fs.existsSync(path.join(projectRoot, "android", "sentry.properties"));
        const hasIosSentryProperties = fs.existsSync(path.join(projectRoot, "ios", "sentry.properties"));
        
        const hasConfig = hasEnvConfig || hasSentryCliRc || hasSentryProperties || hasAndroidSentryProperties || hasIosSentryProperties;
        
        return hasSentryDep && hasCliInstalled && hasConfig;
    } catch {
        return false;
    }
}

function parseSentryProperties(filePath: string): { org?: string; project?: string; token?: string } {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const config: { org?: string; project?: string; token?: string } = {};
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
            
            const [key, value] = trimmed.split('=', 2);
            const cleanKey = key!.trim();
            const cleanValue = value!.trim();
            
            if (cleanKey === 'defaults.org' || cleanKey === 'org') {
                config.org = cleanValue;
            } else if (cleanKey === 'defaults.project' || cleanKey === 'project') {
                config.project = cleanValue;
            } else if (cleanKey === 'auth.token' || cleanKey === 'token') {
                config.token = cleanValue;
            }
        }
        
        return config;
    } catch {
        return {};
    }
}

async function runCommand(command: string, args: string[], cwd: string, env?: Record<string, string>): Promise<void> {
    return new Promise((resolve, reject) => {
        const childProcess = spawn(command, args, {
            cwd,
            stdio: ["pipe", "pipe", "pipe"],
            env: env ? { ...process.env, ...env } : process.env
        });

        let stdout = "";
        let stderr = "";

        childProcess.stdout?.on("data", (data) => {
            stdout += data.toString();
        });

        childProcess.stderr?.on("data", (data) => {
            stderr += data.toString();
        });

        childProcess.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                const errorMessage = stderr || stdout || `Command exited with code ${code}`;
                reject(new Error(errorMessage));
            }
        });

        childProcess.on("error", (error) => {
            reject(error);
        });
    });
}

export async function uploadSourceMapToSentry(options: SentryUploadOptions): Promise<void> {
    const { bundlePath, sourceMapPath, release, platform, projectRoot } = options;
    
    // Step 0: Set up platform-specific sentry.properties symlink if needed
    const rootSentryProperties = path.join(projectRoot, "sentry.properties");
    const platformSentryProperties = path.join(projectRoot, platform, "sentry.properties");
    let createdSymlink = false;
    
    try {
        // If no root sentry.properties exists but platform-specific one does, create a symlink
        if (!fs.existsSync(rootSentryProperties) && fs.existsSync(platformSentryProperties)) {
            try {
                fs.symlinkSync(platformSentryProperties, rootSentryProperties);
                createdSymlink = true;
                console.log(`Created symlink from ${platformSentryProperties} to ${rootSentryProperties}`);
            } catch (symlinkError) {
                // If symlink fails, try copying the file instead
                fs.copyFileSync(platformSentryProperties, rootSentryProperties);
                createdSymlink = true;
                console.log(`Copied ${platformSentryProperties} to ${rootSentryProperties}`);
            }
        } else if (!fs.existsSync(platformSentryProperties)) {
            console.log(`Platform-specific sentry.properties not found at: ${platformSentryProperties}`);
        } else if (fs.existsSync(rootSentryProperties)) {
            console.log(`Root sentry.properties already exists at: ${rootSentryProperties}`);
        }
    } catch (error) {
        console.log(`Error setting up sentry.properties: ${error}`);
    }
    
    try {
        // Step 1: Check if we have Hermes bytecode bundle (which we do)
        // We need to compose the source maps properly for Hermes
        
        const bundleDir = path.dirname(bundlePath);
        const bundleName = path.basename(bundlePath, path.extname(bundlePath));
        const packagerMapPath = path.join(bundleDir, `${bundleName}.packager.map`);
        
        // Handle different naming patterns for Hermes source maps
        let hermesMapPath: string;
        if (bundleName.includes("android")) {
            hermesMapPath = path.join(bundleDir, `${bundleName}.hbc.map`);
        } else {
            // For iOS, the pattern is main.ios.jsbundle -> main.ios.jsbundle.hbc.map
            hermesMapPath = path.join(bundleDir, `${bundleName}.hbc.map`);
        }
        
        const finalMapPath = path.join(bundleDir, `${bundleName}.composed.map`);

        // Step 2: Check if we have the Hermes bytecode source map
        // (This should be generated during the build process)
        if (fs.existsSync(hermesMapPath)) {
            
            // Rename the original Metro source map to .packager.map
            if (fs.existsSync(sourceMapPath)) {
                fs.copyFileSync(sourceMapPath, packagerMapPath);
            }
            
            // Step 3: Compose the source maps using React Native's compose script
            await runCommand("node", [
                "node_modules/react-native/scripts/compose-source-maps.js",
                packagerMapPath,
                hermesMapPath,
                "-o", finalMapPath
            ], projectRoot);
            
            // Step 4: Copy debug ID using Sentry's script
            await runCommand("node", [
                "node_modules/@sentry/react-native/scripts/copy-debugid.js",
                packagerMapPath,
                finalMapPath
            ], projectRoot);
            
            // Clean up temporary files
            if (fs.existsSync(packagerMapPath)) {
                fs.unlinkSync(packagerMapPath);
            }
        } else {
            // No Hermes source map found, use the original Metro source map
            fs.copyFileSync(sourceMapPath, finalMapPath);
        }

        // Step 5: Create Sentry release and upload source maps
        const sentryArgs = [
            "@sentry/cli",
            "sourcemaps",
            "upload",
            "--release", release,
            "--dist", release,
            "--strip-prefix", projectRoot,
            bundlePath,
            finalMapPath
        ];

        // Check for Sentry configuration and add org/project if available
        let sentryOrg = process.env.SENTRY_ORG;
        let sentryProject = process.env.SENTRY_PROJECT;
        let sentryToken = process.env.SENTRY_AUTH_TOKEN;
        
        // If no env vars, try to read from sentry.properties file
        if (!sentryOrg || !sentryProject || !sentryToken) {
            const configFile = fs.existsSync(rootSentryProperties) ? rootSentryProperties : 
                              fs.existsSync(platformSentryProperties) ? platformSentryProperties : null;
            
            if (configFile) {
                const config = parseSentryProperties(configFile);
                sentryOrg = sentryOrg || config.org;
                sentryProject = sentryProject || config.project;
                sentryToken = sentryToken || config.token;
                console.log(`Parsed config from ${configFile}: org=${sentryOrg}, project=${sentryProject}, token=${sentryToken ? '***' + sentryToken.slice(-4) : 'not found'}`);
            }
        }
        
        if (sentryOrg) {
            sentryArgs.splice(4, 0, "--org", sentryOrg);
        }
        if (sentryProject) {
            sentryArgs.splice(sentryOrg ? 6 : 4, 0, "--project", sentryProject);
        }
        
        // Prepare environment variables for the CLI command
        const cliEnv: Record<string, string> = {};
        if (sentryToken) {
            cliEnv.SENTRY_AUTH_TOKEN = sentryToken;
        }
        
        console.log(`Sentry CLI command: npx ${sentryArgs.join(' ')}`);

        // Create the release first
        const createReleaseArgs = ["@sentry/cli", "releases", "new", release];
        if (sentryOrg) {
            createReleaseArgs.push("--org", sentryOrg);
        }
        if (sentryProject) {
            createReleaseArgs.push("--project", sentryProject);
        }
        
        try {
            console.log(`Creating Sentry release: ${release}`);
            await runCommand("npx", createReleaseArgs, projectRoot, cliEnv);
        } catch (error) {
            // Release might already exist, which is fine - continue with upload
            console.log(`Release ${release} may already exist, continuing with upload...`);
        }

        // Upload source maps
        await runCommand("npx", sentryArgs, projectRoot, cliEnv);

        // Finalize the release
        const finalizeReleaseArgs = ["@sentry/cli", "releases", "finalize", release];
        if (sentryOrg) {
            finalizeReleaseArgs.push("--org", sentryOrg);
        }
        if (sentryProject) {
            finalizeReleaseArgs.push("--project", sentryProject);
        }
        
        try {
            console.log(`Finalizing Sentry release: ${release}`);
            await runCommand("npx", finalizeReleaseArgs, projectRoot, cliEnv);
        } catch (error) {
            console.log(`Warning: Could not finalize release ${release}: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Clean up the final composed source map
        if (fs.existsSync(finalMapPath)) {
            fs.unlinkSync(finalMapPath);
        }
        
    } catch (error) {
        throw new Error(`Failed to upload sourcemaps to Sentry: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        // Clean up the symlinked sentry.properties file if we created it
        if (createdSymlink && fs.existsSync(rootSentryProperties)) {
            fs.unlinkSync(rootSentryProperties);
        }
    }
}