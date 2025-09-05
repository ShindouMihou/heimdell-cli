import {type Argv} from "yargs";
import {createHeimdellClient} from "../api/client.ts";
import {render} from "ink";
import {useEffect, useState} from "react";
import Border from "../components/Border.tsx";
import {loadCredentials} from "../credentials/autoload.ts";
import EnvironmentIntroduction from "./pages/env/EnvironmentIntroduction.tsx";
import EnvironmentStatus from "./pages/env/EnvironmentStatus.tsx";
import {sanitizeEnvironmentName, validateEnvironmentName, switchToEnvironment} from "../utils/environment.ts";
import {isCredentialsEncrypted, decryptCredentialsFile} from "../utils/encryption.ts";
import EncryptionKeyPrompt from "../components/EncryptionKeyPrompt.tsx";

type EnvironmentComponentProps = {
    environment: string;
}
function EnvironmentComponent({environment}: EnvironmentComponentProps) {
    const [page, setPage] = useState(0);

    const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string | undefined>();
    const [successMessage, setSuccessMessage] = useState<string | undefined>();
    const [encryptionError, setEncryptionError] = useState<string | undefined>();
    const [needsEncryptionKey, setNeedsEncryptionKey] = useState(false);

    const sanitizedEnvironment = sanitizeEnvironmentName(environment);
    const credentialsPath = `.heimdell/${sanitizedEnvironment}/credentials.json`;

    const [credentials, setCredentials] = useState<typeof globalThis.credentials>();

    const loadCredentialsWithKey = async (encryptionKey?: string) => {
        setStatus("loading");
        setLoadingMessage("Loading credentials...");
        setError(null);
        setEncryptionError(undefined);
        
        try {
            // Check if credentials are encrypted
            if (isCredentialsEncrypted(credentialsPath)) {
                if (!encryptionKey) {
                    setNeedsEncryptionKey(true);
                    setStatus("idle");
                    return;
                }
                
                // Try to decrypt with provided key
                const credentialsData = decryptCredentialsFile(credentialsPath, encryptionKey);
                // Set global credentials for client to use
                globalThis.credentials = credentialsData;
                setCredentials(credentialsData);
                setNeedsEncryptionKey(false);
            } else {
                // Load unencrypted credentials
                const creds = await loadCredentials(credentialsPath);
                setCredentials(creds);
            }
        } catch (error: Error | any) {
            if (error instanceof Error && error.message.includes('Invalid encryption key')) {
                setEncryptionError("Invalid encryption key. Please try again.");
                setNeedsEncryptionKey(true);
            } else {
                setError(typeof error === "string" ? error : error.message);
            }
        } finally {
            setStatus("idle");
        }
    };

    useEffect(() => {
        loadCredentialsWithKey();
    }, []);

    const handleEncryptionKeySubmit = (key: string) => {
        loadCredentialsWithKey(key);
    };

    useEffect(() => {
        if (page === 1) {
            async function switchEnvironment() {
                setStatus("loading");
                setError(null);
                setLoadingMessage("Switching to " + sanitizedEnvironment + " environment...");

                const heimdellClient = createHeimdellClient();
                const response = await heimdellClient.auth.login();
                if (response.statusCode >= 200 && response.statusCode <= 299) {
                    try {
                        // Switch to the environment using copy-based approach
                        await switchToEnvironment(sanitizedEnvironment);

                        // Just appreciate the animation and smoothness of Ink a little bit.
                        setTimeout(() => {
                            setSuccessMessage("ENVIRONMENT SWITCHED");
                            setStatus("ok");
                        }, 1_000);
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
            switchEnvironment();
        }
    }, [page]);

    if (needsEncryptionKey) {
        return (
            <EncryptionKeyPrompt
                onSubmit={handleEncryptionKeySubmit}
                message={`The credentials for environment "${sanitizedEnvironment}" are encrypted. Please enter the encryption key for this environment:`}
                error={encryptionError}
            />
        );
    }

    return (
        <Border>
            {(page === 0 && credentials == null) && <EnvironmentStatus 
                status={status} 
                error={error} 
                loadingMessage={loadingMessage}
                successMessage={successMessage}
            />}
            {(page === 0 && credentials != null) && <EnvironmentIntroduction
                onConfirm={() => setPage(1)}
                environment={sanitizedEnvironment || ''}
                credentials={credentials}
            />}
            {page === 1 && <EnvironmentStatus 
                status={status} 
                error={error} 
                loadingMessage={loadingMessage}
                successMessage={successMessage}
            />}
        </Border>
    )
}

export const useEnvCommand = (yargs: Argv) => {
    yargs.command(
        'env <environment>',
        'Switches the environment context of Heimdell, such that it can deploy to a specific Heimdell server.',
        (yargs) => {
            yargs.positional("environment", {
                type: 'string',
                alias: 'e',
                description: 'The environment to switch into (e.g., development, staging, production).',
            })
            yargs.check((argv) => {
                if (argv.environment) {
                    validateEnvironmentName(argv.environment as string);
                }
                return true;
            })
            yargs.demandOption(['environment'], 'You must provide an environment to switch into.');
        },
        async function (args) {
            const environment = args.environment as string;
            const sanitizedEnvironment = sanitizeEnvironmentName(environment);
            if (!sanitizedEnvironment) {
                console.error("Invalid environment name. Please use only letters, numbers, and underscores.");
                return;
            }

            const envDir = Bun.file(".heimdell/" + sanitizedEnvironment + "/credentials.json");
            if (!await envDir.exists()) {
                console.error(`No credentials found for environment "${sanitizedEnvironment}". Please make sure you have logged in to this environment before switching to it. \nYou can use heimdell login -e "${environment}" to log in.`);
                return;
            }
            
            render(<EnvironmentComponent environment={environment}/>);
        },
    )
}
