export type Update = {
    update?: {
        download: string,
        bundleId: string,
        forceUpgrade: boolean,
    },
    error?: string
}
