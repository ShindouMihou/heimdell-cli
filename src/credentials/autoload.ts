export const autoloadCredentials = async () => {
    const file = Bun.file(".heimdell/credentials.json");
    if (await file.exists()) {
        try {
            const content = await file.text();
            const credentials = JSON.parse(content);
            if (credentials && typeof credentials === 'object') {
                globalThis.credentials = credentials;
            }
        } catch (error) {
            // Skip loading credentials if the file is not valid JSON.
        }
    }
}
