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