import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const sanitizeEnvironmentName = (environment?: string): string | null => {
    if (!environment) return null;
    return environment.replace(/[^a-zA-Z0-9_]/g, '');
};

export const validateEnvironmentName = (environment: string): void => {
    if (!environment || environment.trim() === '') {
        throw new Error('Environment name cannot be empty');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(environment)) {
        throw new Error('Environment name can only contain letters, numbers, and underscores');
    }
};

/**
 * Get the temp directory path and ensure it exists
 */
const getTempDir = (): string => {
    const heimdellDir = path.join(os.homedir(), '.heimdell');
    const tempDir = path.join(heimdellDir, '.temp');
    
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    
    return tempDir;
};

/**
 * Generate a backup file path in the temp directory
 */
const getBackupPath = (originalPath: string): string => {
    const tempDir = getTempDir();
    const relativePath = path.relative(os.homedir(), originalPath);
    // Replace path separators with underscores to create a flat structure
    const backupName = relativePath.replace(/[\/\\]/g, '_') + '.bak';
    return path.join(tempDir, backupName);
};

/**
 * Create or update a symlink from source to target
 * On Windows, falls back to copying if symlink creation fails
 */
export const createSymlink = (source: string, target: string): boolean => {
    try {
        // Remove existing target if it exists (could be file or symlink)
        if (fs.existsSync(target)) {
            const stats = fs.lstatSync(target);
            if (stats.isSymbolicLink()) {
                fs.unlinkSync(target);
            } else {
                // If it's a regular file, back it up first
                const backupPath = getBackupPath(target);
                if (fs.existsSync(backupPath)) {
                    fs.unlinkSync(backupPath);
                }
                fs.renameSync(target, backupPath);
            }
        }
        
        // Ensure source exists
        if (!fs.existsSync(source)) {
            throw new Error(`Source file does not exist: ${source}`);
        }
        
        // Create symlink - use relative path for portability
        const relativePath = path.relative(path.dirname(target), source);
        
        try {
            // Try to create symlink first
            fs.symlinkSync(relativePath, target, 'file');
            return true; // Symlink created successfully
        } catch (symlinkError) {
            // On Windows or without permissions, symlinks might fail
            // Fall back to copying file as a workaround
            if (os.platform() === 'win32') {
                console.warn('Symlink creation failed on Windows, falling back to file copy');
            } else {
                console.warn('Symlink creation failed, falling back to file copy');
            }
            fs.copyFileSync(source, target);
            return false; // Used file copy fallback
        }
    } catch (error) {
        throw new Error(`Failed to create symlink: ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Check if the main credentials file is a symlink
 */
export const isUsingSymlinks = (): boolean => {
    try {
        if (!fs.existsSync(".heimdell/credentials.json")) {
            return false;
        }
        return fs.lstatSync(".heimdell/credentials.json").isSymbolicLink();
    } catch (error) {
        return false;
    }
};

/**
 * Switch to a specific environment using symlinks (with file copy fallback)
 * This approach provides real-time credential synchronization between environment files and main credentials
 */
export const switchToEnvironment = async (environment: string | null): Promise<void> => {
    try {
        const mainCredentialsPath = ".heimdell/credentials.json";
        
        if (environment) {
            // Switch to specific environment
            const envCredentialsPath = `.heimdell/${environment}/credentials.json`;
            
            if (!fs.existsSync(envCredentialsPath)) {
                throw new Error(`No credentials found for environment "${environment}"`);
            }
            
            // Ensure environment field is set in the source file for self-describing credentials
            const content = await Bun.file(envCredentialsPath).text();
            const credentials = JSON.parse(content);
            if (credentials.environment !== environment) {
                credentials.environment = environment;
                await Bun.file(envCredentialsPath).write(JSON.stringify(credentials, null, 2));
            }
            
            // Create symlink from environment file to main file for real-time sync
            const usingSymlinks = createSymlink(envCredentialsPath, mainCredentialsPath);
            
            if (!usingSymlinks) {
                // File copy fallback - warn about UX limitations
                console.warn("⚠️  Note: Using file copy instead of symlinks due to system limitations.");
                console.warn("   For real-time credential sync, enable Developer Mode on Windows or use a Unix system.");
                console.warn("   With file copy mode:");
                console.warn("   • Edit credentials in .heimdell/" + environment + "/credentials.json");
                console.warn("   • Changes require running 'heimdall env " + environment + "' to become active");
                console.warn("   • Avoid editing .heimdell/credentials.json directly as changes will be lost");
            } else {
                console.log("✅ Environment switched with real-time credential sync enabled");
                console.log("   You can edit credentials in either location:");
                console.log("   • .heimdell/credentials.json (main file)");  
                console.log("   • .heimdell/" + environment + "/credentials.json (environment file)");
                console.log("   Changes to either file are immediately reflected in both locations");
            }
        } else {
            // Switch to default environment (no symlink, direct file)
            // Remove symlink if it exists and restore default behavior
            if (fs.existsSync(mainCredentialsPath)) {
                const stats = fs.lstatSync(mainCredentialsPath);
                if (stats.isSymbolicLink()) {
                    fs.unlinkSync(mainCredentialsPath);
                    
                    // Look for backup file or create minimal credentials
                    const backupPath = getBackupPath(mainCredentialsPath);
                    if (fs.existsSync(backupPath)) {
                        fs.renameSync(backupPath, mainCredentialsPath);
                        
                        // Remove environment field from restored file for default environment
                        const content = await Bun.file(mainCredentialsPath).text();
                        const credentials = JSON.parse(content);
                        delete credentials.environment;
                        await Bun.file(mainCredentialsPath).write(JSON.stringify(credentials, null, 2));
                    }
                }
            }
        }
    } catch (error) {
        throw new Error(`Failed to switch environment: ${error instanceof Error ? error.message : String(error)}`);
    }
};