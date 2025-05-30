export type Bundle = {
    id: string;
    version: string;
    tag: string;
    note?: string;
    author: string;
    is_disposed: 0 | 1;
    created_at: string;
    error?: string;
}

export type BundleArray = Bundle[];
