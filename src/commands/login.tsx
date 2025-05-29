import type {Argv} from "yargs";
import {createHeimdellClient} from "../api/client.ts";
import {render} from "ink";
import {useEffect, useState} from "react";
import LoginIntroduction from "./pages/login/LoginIntroduction.tsx";
import EnterServerAddress from "./pages/login/LoginEnterServerAddress.tsx";
import LoginEnterUsername from "./pages/login/LoginEnterUsername.tsx";
import LoginEnterPassword from "./pages/login/LoginEnterPassword.tsx";
import LoginStatus from "./pages/login/LoginStatus.tsx";
import Border from "../components/Border.tsx";
import LoginEnterProjectTag from "./pages/login/LoginEnterProjectTag.tsx";
import LoginSelectPlatforms from "./pages/login/LoginSelectPlatforms.tsx";

function LoginComponent() {
    const [page, setPage] = useState(0);

    const [serverAddress, setServerAddress] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [tag, setTag] = useState("");
    const [platforms, setPlatforms] = useState<("android" | "ios")[]>([]);

    const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (page === 6) {
            async function login() {
                setStatus("loading");
                setError(null);

                const heimdellClient = createHeimdellClient(serverAddress, { username, password });
                const response = await heimdellClient.auth.login();
                if (response.statusCode >= 200 && response.statusCode <= 299) {
                    try {
                        const credentialsContent = JSON.stringify({
                            baseUrl: serverAddress,
                            username,
                            password,
                            tag,
                            platforms
                        });

                        const gitignoreContents = [
                            "credentials.json",
                            ".temp"
                        ].join("\n");

                        await Bun.file(".heimdell/credentials.json").write(credentialsContent);
                        await Bun.file(".heimdell/.gitignore").write(gitignoreContents);

                        // Just appreciate the animation and smoothness of Ink a little bit.
                        setTimeout(() => setStatus("ok"), 1_000);
                    } catch (e) {
                        setStatus("error");
                        setError(`Failed to save credentials: ${e instanceof Error ? e.message : String(e)}`);
                        return;
                    }
                    return;
                }

                setTimeout(() => {
                    setStatus("error");
                    setError(`Login failed: ${response.statusCode} - ${response.data}`);
                }, 1_000);
            }
            login();
        }
    }, [page]);

    return (
        <Border>
            {page === 0 && <LoginIntroduction
                onConfirm={() => setPage(1)}
            />}
            {page === 1 && <EnterServerAddress
                onSubmit={(serverAddress) => {
                    setServerAddress(serverAddress);
                    setPage(2);
                }}
            />}
            {page === 2 && <LoginEnterUsername
                onSubmit={(username) => {
                    setUsername(username);
                    setPage(3);
                }}
            />}
            {page === 3 && <LoginEnterPassword
                username={username}
                onSubmit={(password) => {
                    setPassword(password);
                    setPage(4);
                }}
            />}
            {page === 4 && <LoginEnterProjectTag
                onSubmit={(tag) => {
                    setTag(tag);
                    setPage(5);
                }}
            />}
            {page === 5 && <LoginSelectPlatforms
                onSubmit={(platforms) => {
                    setPlatforms(platforms as ("android" | "ios")[]);
                    setPage(6);
                }}
            />}
            {page === 6 && <LoginStatus status={status} error={error}/>}
        </Border>
    )
}

export const useLoginCommand = (yargs: Argv) => {
    yargs.command(
        'login',
        'Logs into Heimdell to enable auto-loading credentials within the project.',
        (yargs) => {},
        async function () {
            render(<LoginComponent/>);
        },
    )
}
