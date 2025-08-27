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
 * Copy credentials from environment-specific folder to main credentials file
 * with environment field populated
 */
export const switchToEnvironment = async (environment: string | null): Promise<void> => {
    const fs = await import("node:fs");
    
    try {
        let sourceFile: string;
        let targetCredentials: any;
        
        if (environment) {
            // Load from environment-specific folder
            sourceFile = `.heimdell/${environment}/credentials.json`;
            if (!fs.existsSync(sourceFile)) {
                throw new Error(`No credentials found for environment "${environment}"`);
            }
            
            const content = await Bun.file(sourceFile).text();
            targetCredentials = JSON.parse(content);
            targetCredentials.environment = environment;
        } else {
            // Load from default location and remove environment field
            sourceFile = `.heimdell/credentials.json`;
            if (!fs.existsSync(sourceFile)) {
                throw new Error("No default credentials found");
            }
            
            const content = await Bun.file(sourceFile).text();
            targetCredentials = JSON.parse(content);
            delete targetCredentials.environment;
        }
        
        // Write to main credentials file
        await Bun.file(".heimdell/credentials.json").write(JSON.stringify(targetCredentials, null, 2));
    } catch (error) {
        throw new Error(`Failed to switch environment: ${error instanceof Error ? error.message : String(error)}`);
    }
};