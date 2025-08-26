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
        const content = await file.text();
        const credentials = JSON.parse(content);
        if (credentials && typeof credentials === 'object') {
            globalThis.credentials = credentials;
        }
        return globalThis.credentials;
    } else {
        throw new Error("No credentials found.");
    }
}