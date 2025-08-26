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