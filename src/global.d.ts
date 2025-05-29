declare module globalThis {
    var credentials: {
        username: string;
        password: string;
        baseUrl: string;
    } | undefined;
}
