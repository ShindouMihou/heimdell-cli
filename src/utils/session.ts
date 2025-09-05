import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const SESSION_ENV_VAR = 'HEIMDELL_SESSION_KEY';
const SESSION_FILE_PREFIX = '.heimdell_session_';

export class SessionManager {
    private static instance: SessionManager;

    private constructor() {}

    public static getInstance(): SessionManager {
        if (!SessionManager.instance) {
            SessionManager.instance = new SessionManager();
        }
        return SessionManager.instance;
    }

    public getEncryptionKey(): string | null {
        // First check environment variable from shell
        if (process.env[SESSION_ENV_VAR]) {
            return process.env[SESSION_ENV_VAR];
        }

        // Then check session file
        return this.getKeyFromSessionFile();
    }

    public hasEncryptionKey(): boolean {
        return this.getEncryptionKey() !== null;
    }

    public setEncryptionKey(key: string): void {
        // Set in current process environment
        process.env[SESSION_ENV_VAR] = key;
        
        // Also save to a session file for persistence across commands
        this.saveKeyToSessionFile(key);
    }

    private getSessionFilePath(): string {
        const ppid = process.ppid || process.pid;
        return path.join(os.tmpdir(), `${SESSION_FILE_PREFIX}${ppid}`);
    }

    private saveKeyToSessionFile(key: string): void {
        try {
            const sessionFile = this.getSessionFilePath();
            fs.writeFileSync(sessionFile, key, { mode: 0o600 }); // Only readable by owner
        } catch (error) {
            // Ignore file system errors
        }
    }

    private getKeyFromSessionFile(): string | null {
        try {
            const sessionFile = this.getSessionFilePath();
            if (fs.existsSync(sessionFile)) {
                const key = fs.readFileSync(sessionFile, 'utf8').trim();
                return key || null;
            }
        } catch (error) {
            // Ignore file system errors
        }
        return null;
    }

    public clearEncryptionKey(): void {
        delete process.env[SESSION_ENV_VAR];
        
        try {
            const sessionFile = this.getSessionFilePath();
            if (fs.existsSync(sessionFile)) {
                fs.unlinkSync(sessionFile);
            }
        } catch (error) {
            // Ignore file system errors
        }
    }

}