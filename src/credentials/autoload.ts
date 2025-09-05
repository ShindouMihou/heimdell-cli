import {decryptCredentialsFile, isCredentialsEncrypted} from "../utils/encryption.ts";
import {SessionManager} from "../utils/session.ts";

export const autoloadCredentials = async () => {
    try {
        await loadCredentials(".heimdell/credentials.json");
    } catch (error) {
        // Skip loading credentials if the file is not valid JSON.
    }
}

export const loadCredentials = async (path: string) => {
    const file = Bun.file(path);
    if (await file.exists()) {
        // Check if the credentials are encrypted
        if (isCredentialsEncrypted(path)) {
            const sessionManager = SessionManager.getInstance();
            const encryptionKey = sessionManager.getEncryptionKey();
            
            if (!encryptionKey) {
                throw new Error("Credentials are encrypted but no encryption key is available. Please run a command that prompts for the key.");
            }
            
            try {
                const credentials = decryptCredentialsFile(path, encryptionKey);
                if (credentials && typeof credentials === 'object') {
                    globalThis.credentials = credentials;
                }
                return globalThis.credentials;
            } catch (error) {
                if (error instanceof Error && error.message.includes('Invalid encryption password')) {
                    // Clear invalid key from session
                    sessionManager.clearEncryptionKey();
                    throw new Error("Invalid encryption key. Please run a command that prompts for the correct key.");
                }
                throw error;
            }
        } else {
            // Handle unencrypted credentials (legacy support)
            const content = await file.text();
            const credentials = JSON.parse(content);
            if (credentials && typeof credentials === 'object') {
                globalThis.credentials = credentials;
            }
            return globalThis.credentials;
        }
    } else {
        throw new Error("No credentials found.");
    }
}

export const getCurrentEnvironmentFromCredentials = async (): Promise<string | null> => {
    try {
        const creds = await loadCredentials(".heimdell/credentials.json");
        if (creds && creds.environment) {
            return creds.environment;
        }
        // If no environment field, check if we're in the main .heimdell folder (default)
        return null; // null represents default environment
    } catch (error) {
        return null;
    }
}