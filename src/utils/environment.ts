// Environment name validation and sanitization utilities

export function validateEnvironmentName(name: string): void {
    if (!name || typeof name !== 'string') {
        throw new Error('Environment name must be a non-empty string');
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        throw new Error('Environment name can only contain letters, numbers, underscores, and hyphens');
    }
    
    if (name.length > 50) {
        throw new Error('Environment name must be 50 characters or less');
    }
}

export function sanitizeEnvironmentName(name?: string): string | null {
    if (!name || typeof name !== 'string') {
        return null;
    }
    
    // Remove invalid characters and limit length
    const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 50);
    
    if (sanitized.length === 0) {
        return null;
    }
    
    return sanitized;
}