import type {BunFile} from "bun";

export const uploadBundleFile = async (id: string, android?: BunFile, ios?: BunFile) => {
    if (!android && !ios) {
        throw new Error("At least one platform must be provided for upload.");
    }

    const formData = new FormData();
    if (android) {
        formData.append('android', android)
    }
    if (ios) {
        formData.append('ios', ios)
    }

    const credentials = globalThis.credentials!;

    const response = await fetch(`${credentials.baseUrl}/api/v1/cli/bundle/${id}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
            'Authorization': `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`
        }
    });

    if (response.ok) {
        return
    }

    const errorText = await response.text();
    throw new Error(`Failed to upload bundle file: ${response.status} - ${errorText}`);
}
