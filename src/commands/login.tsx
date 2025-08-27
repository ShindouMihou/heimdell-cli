import {type Argv} from "yargs";
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
import fs from "node:fs";
import {sanitizeEnvironmentName, validateEnvironmentName, createSymlink} from "../utils/environment.ts";
import {getCurrentEnvironmentFromCredentials} from "../credentials/autoload.ts";

type LoginComponentProps = {
    environment?: string;
}
function LoginComponent({environment}: LoginComponentProps) {
    const [page, setPage] = useState(0);

    const [serverAddress, setServerAddress] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [tag, setTag] = useState("");
    const [platforms, setPlatforms] = useState<("android" | "ios")[]>([]);

    const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
    const [error, setError] = useState<string | null>(null);

    const sanitizedEnvironment = sanitizeEnvironmentName(environment);

    useEffect(() => {
        if (page === 6) {
            async function login() {
                setStatus("loading");
                setError(null);

                globalThis.credentials = {
                    baseUrl: serverAddress,
                    username,
                    password,
                    tag,
                    platforms,
                    environment: sanitizedEnvironment
                };

                const heimdellClient = createHeimdellClient();
                const response = await heimdellClient.auth.login();
                if (response.statusCode >= 200 && response.statusCode <= 299) {
                    try {
                        const credentialsData = {
                            baseUrl: serverAddress,
                            username,
                            password,
                            tag,
                            platforms,
                            environment: sanitizedEnvironment
                        };

                        const gitignoreContents = [
                            "credentials.json",
                            ".temp"
                        ].join("\n");

                        const environmentDir = sanitizedEnvironment ?
                            `.heimdell/${sanitizedEnvironment}` :
                            ".heimdell";

                        // Ensure environment directory exists
                        fs.mkdirSync(environmentDir, { recursive: true });

                        if (sanitizedEnvironment) {
                            // Save credentials to environment-specific file
                            await Bun.file(`${environmentDir}/credentials.json`).write(JSON.stringify(credentialsData, null, 2));
                            
                            // Create symlink from environment file to main credentials file
                            const envCredentialsPath = `${environmentDir}/credentials.json`;
                            const mainCredentialsPath = ".heimdell/credentials.json";
                            const usingSymlinks = createSymlink(envCredentialsPath, mainCredentialsPath);
                            
                            if (!usingSymlinks) {
                                console.warn("\n⚠️  Note: Using file copy instead of symlinks. Credential modifications should be done by running 'heimdell login' again rather than editing files directly.");
                            }
                        } else {
                            // For default environment, save directly to main file without environment field
                            const defaultCredentials = {
                                baseUrl: serverAddress,
                                username,
                                password,
                                tag,
                                platforms
                            };
                            await Bun.file(".heimdell/credentials.json").write(JSON.stringify(defaultCredentials, null, 2));
                        }
                        
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
                environment={sanitizedEnvironment}
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
        (yargs) => {
            yargs.option({
                environment: {
                    type: 'string',
                    alias: 'e',
                    description: 'The environment to login to (e.g., development, staging, production).',
                    default: 'default',
                },
            });

            yargs.check((argv) => {
                if (argv.environment) {
                    validateEnvironmentName(argv.environment as string);
                }
                return true;
            })
        },
        async function (args) {
            let environment = args.environment as string | undefined;
            
            // If no environment specified, try to use current environment
            if (!environment || environment === 'default') {
                const currentEnv = await getCurrentEnvironmentFromCredentials();
                if (currentEnv) {
                    environment = currentEnv;
                }
            }
            
            render(<LoginComponent environment={environment}/>);
        },
    )
}
