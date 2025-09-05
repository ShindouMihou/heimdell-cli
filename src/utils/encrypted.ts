import crypto from "crypto";
export const encrypt = (data: string, key: string) => {
    return crypto.privateEncrypt(key, Buffer.from(data, 'utf-8'));
}

export const decrypt = (data: Buffer, key: string) => {
    return crypto.privateDecrypt(key, data).toString('utf-8');
}

export const loadPrivateKey = async () => {
    if (process.env.PRIVATE_KEY) {
        return process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
    }
    throw "NO_PRIVATE_KEY";
}