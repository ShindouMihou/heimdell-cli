declare module globalThis {
    var credentials: {
        username: string;
        password: string;
        baseUrl: string;
        tag: string;
        platforms: ("android"|"ios")[];
    } | undefined;
}
