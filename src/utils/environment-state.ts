import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CURRENT_ENV_FILE = ".heimdell/.current-env";

/**
 * Save the current active environment to state file
 */
export const setCurrentEnvironment = async (environment: string | null): Promise<void> => {
    try {
        if (environment === null) {
            // Remove current environment file if setting to null
            if (fs.existsSync(CURRENT_ENV_FILE)) {
                fs.unlinkSync(CURRENT_ENV_FILE);
            }
            return;
        }
        
        // Ensure .heimdell directory exists
        fs.mkdirSync(".heimdell", { recursive: true });
        
        // Write current environment to file
        await Bun.file(CURRENT_ENV_FILE).write(environment);
    } catch (error) {
        throw new Error(`Failed to save current environment: ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Get the current active environment from state file
 */
export const getCurrentEnvironment = async (): Promise<string | null> => {
    try {
        if (!fs.existsSync(CURRENT_ENV_FILE)) {
            return null;
        }
        
        const content = await Bun.file(CURRENT_ENV_FILE).text();
        return content.trim() || null;
    } catch (error) {
        // If there's any error reading the file, assume no current environment
        return null;
    }
};

/**
 * Create or update a symlink from source to target
 * On Windows, falls back to copying if symlink creation fails
 */
export const createSymlink = (source: string, target: string): void => {
    try {
        // Remove existing target if it exists (could be file or symlink)
        if (fs.existsSync(target)) {
            const stats = fs.lstatSync(target);
            if (stats.isSymbolicLink()) {
                fs.unlinkSync(target);
            } else {
                // If it's a regular file, back it up first
                const backupPath = target + ".bak";
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
        } catch (symlinkError) {
            // On Windows, symlinks might fail due to permissions
            // Fall back to copying file as a workaround
            if (os.platform() === 'win32') {
                console.warn('Symlink creation failed on Windows, falling back to file copy');
                fs.copyFileSync(source, target);
            } else {
                throw symlinkError;
            }
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