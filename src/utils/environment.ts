import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export function sanitizeEnvironmentName(environment: string | undefined): string {
    if (!environment) return '';
    
    return environment
        .toLowerCase()
        .replaceAll(" ", "_")
        .replaceAll(/[^a-z0-9_]/g, "");
}

export function validateEnvironmentName(environment: string | undefined): void {
    if (!environment || environment.length === 0) {
        throw new Error("The environment name cannot be empty. Please provide a valid environment name.");
    }
    
    if (environment.length > 30) {
        throw new Error("The environment name is too long. Please keep it under 30 characters.");
    }
    
    const sanitized = sanitizeEnvironmentName(environment);
    if (!sanitized || sanitized.length === 0) {
        throw new Error("The environment name is invalid. Please use only letters, numbers, and underscores.");
    }
}

/**
 * Get the temp directory path and ensure it exists
 * Uses project-local .heimdell/.temp to avoid cross-device operations
 */
const getTempDir = (): string => {
    const tempDir = path.join('.heimdell', '.temp');

    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    return tempDir;
};

/**
 * Safely move a file, handling cross-device operations
 * Uses copy-then-delete pattern instead of rename to work across filesystems
 */
const moveFileSafe = (source: string, target: string): void => {
    try {
        // Try rename first (fastest if on same filesystem)
        fs.renameSync(source, target);
    } catch (error: any) {
        // If rename fails with EXDEV (cross-device error), fall back to copy-delete
        if (error.code === 'EXDEV') {
            fs.copyFileSync(source, target);
            fs.unlinkSync(source);
        } else {
            throw error;
        }
    }
};

/**
 * Generate a backup file path in the temp directory
 */
const getBackupPath = (originalPath: string): string => {
    const tempDir = getTempDir();
    const backupName = originalPath.replace(/[\/\\]/g, '_') + '.bak';
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
                moveFileSafe(target, backupPath);
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
 * Switch to a specific environment using symlinks (with file copy fallback)
 * This approach provides real-time credential synchronization between environment files and main credentials
 */
export const switchToEnvironment = async (environment: string | null): Promise<void> => {
    try {
        const mainCredentialsPath = ".heimdell/credentials.json";
        
        if (environment) {
            const envCredentialsPath = `.heimdell/${environment}/credentials.json`;
            if (!fs.existsSync(envCredentialsPath)) {
                throw new Error(`No credentials found for environment "${environment}"`);
            }
            const content = await Bun.file(envCredentialsPath).text();
            const credentials = JSON.parse(content);
            if (credentials.environment !== environment) {
                credentials.environment = environment;
                await Bun.file(envCredentialsPath).write(JSON.stringify(credentials, null, 2));
            }
            createSymlink(envCredentialsPath, mainCredentialsPath);
        } else {
            if (fs.existsSync(mainCredentialsPath)) {
                const stats = fs.lstatSync(mainCredentialsPath);
                if (stats.isSymbolicLink()) {
                    fs.unlinkSync(mainCredentialsPath);
                    const backupPath = getBackupPath(mainCredentialsPath);
                    if (fs.existsSync(backupPath)) {
                        moveFileSafe(backupPath, mainCredentialsPath);
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