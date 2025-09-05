import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;

export interface EncryptedData {
    encrypted: string;
    iv: string;
    tag: string;
    salt: string;
}

export function deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

export function encryptData(data: string, password: string): EncryptedData {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKey(password, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from('heimdell-credentials'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        salt: salt.toString('hex')
    };
}

export function decryptData(encryptedData: EncryptedData, password: string): string {
    try {
        const salt = Buffer.from(encryptedData.salt, 'hex');
        const key = deriveKey(password, salt);
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const tag = Buffer.from(encryptedData.tag, 'hex');
        
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        decipher.setAAD(Buffer.from('heimdell-credentials'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        // Crypto library throws various error messages for authentication failures
        if (error instanceof Error && (
            error.message.includes('bad decrypt') ||
            error.message.includes('Unsupported state or unable to authenticate data') ||
            error.message.includes('authentication failed') ||
            error.message.includes('auth')
        )) {
            throw new Error('Invalid encryption key');
        }
        throw error;
    }
}

export function isCredentialsEncrypted(credentialsPath: string): boolean {
    try {
        if (!fs.existsSync(credentialsPath)) {
            return false;
        }
        
        const content = fs.readFileSync(credentialsPath, 'utf8');
        const parsed = JSON.parse(content);
        
        // Check if it has the encrypted data structure
        return !!(parsed.encrypted && parsed.iv && parsed.tag && parsed.salt);
    } catch {
        return false;
    }
}

export function encryptCredentialsFile(credentialsPath: string, password: string): void {
    if (!fs.existsSync(credentialsPath)) {
        throw new Error(`Credentials file not found: ${credentialsPath}`);
    }
    
    if (isCredentialsEncrypted(credentialsPath)) {
        throw new Error('Credentials file is already encrypted');
    }
    
    const originalData = fs.readFileSync(credentialsPath, 'utf8');
    const encryptedData = encryptData(originalData, password);
    
    fs.writeFileSync(credentialsPath, JSON.stringify(encryptedData, null, 2));
}

export function decryptCredentialsFile(credentialsPath: string, password: string): any {
    if (!fs.existsSync(credentialsPath)) {
        throw new Error(`Credentials file not found: ${credentialsPath}`);
    }
    
    const content = fs.readFileSync(credentialsPath, 'utf8');
    
    try {
        const encryptedData = JSON.parse(content) as EncryptedData;
        
        // If it's not encrypted, return the parsed content directly
        if (!encryptedData.encrypted || !encryptedData.iv || !encryptedData.tag || !encryptedData.salt) {
            return JSON.parse(content);
        }
        
        const decryptedData = decryptData(encryptedData, password);
        return JSON.parse(decryptedData);
    } catch (error) {
        if (error instanceof Error && (
            error.message.includes('Invalid encryption key') ||
            error.message.includes('bad decrypt')
        )) {
            throw new Error('Invalid encryption key');
        }
        throw error;
    }
}

export function findUnencryptedCredentials(heimdellDir: string): string[] {
    const unencryptedFiles: string[] = [];
    
    if (!fs.existsSync(heimdellDir)) {
        return unencryptedFiles;
    }
    
    const entries = fs.readdirSync(heimdellDir, { withFileTypes: true });
    
    for (const entry of entries) {
        if (entry.isDirectory()) {
            const credentialsPath = path.join(heimdellDir, entry.name, 'credentials.json');
            if (fs.existsSync(credentialsPath) && !isCredentialsEncrypted(credentialsPath)) {
                unencryptedFiles.push(credentialsPath);
            }
        }
    }
    
    return unencryptedFiles;
}