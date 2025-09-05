import {type Argv} from "yargs";
import {render} from "ink";
import {useState, useEffect, useRef} from "react";
import {Box, Text} from "ink";
import Border from "../components/Border.tsx";
import {TextInput, PasswordInput} from "@inkjs/ui";
import {findUnencryptedCredentials, encryptCredentialsFile} from "../utils/encryption.ts";
import os from "node:os";
import path from "node:path";
import {encrypt} from "../utils/encrypted.ts";

function EncryptCredentialsComponent() {
    const [step, setStep] = useState<"scanning" | "found" | "encrypt" | "confirm" | "encrypting" | "complete" | "error">("scanning");
    const [unencryptedFiles, setUnencryptedFiles] = useState<string[]>([]);

    const encryptionKey = useRef("");
    const confirmKey = useRef("");

    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    useEffect(() => {
        async function scanForUnencryptedCredentials() {
            try {
                const heimdellDir = path.join(os.homedir(), ".heimdell");
                const projectHeimdellDir = ".heimdell";
                
                let files: string[] = [];
                
                // Check project directory
                const projectFiles = findUnencryptedCredentials(projectHeimdellDir);
                files = files.concat(projectFiles);
                
                // Check global directory
                const globalFiles = findUnencryptedCredentials(heimdellDir);
                files = files.concat(globalFiles);
                
                setUnencryptedFiles(files);
                
                if (files.length > 0) {
                    setStep("found");
                } else {
                    setStep("complete");
                }
            } catch (e) {
                setError(`Failed to scan for credentials: ${e instanceof Error ? e.message : String(e)}`);
                setStep("error");
            }
        }
        
        scanForUnencryptedCredentials();
    }, []);

    const handleInitialSubmit = () => {
        if (encryptionKey.current.length < 7) {
            setError("Encryption key must be at least 7 characters long");
            return;
        }
        setError(null);
        setStep("confirm");
    };

    const handleConfirmSubmit = () => {
        if (confirmKey.current !== encryptionKey.current) {
            setError("Encryption keys do not match");
            setStep("encrypt");
            encryptionKey.current = "";
            confirmKey.current = "";
            return;
        }
        setStep("encrypting");
        encryptFiles();
    };

    const encryptFiles = async () => {
        try {
            setProgress({ current: 0, total: unencryptedFiles.length });
            
            for (let i = 0; i < unencryptedFiles.length; i++) {
                const file = unencryptedFiles[i];
                encryptCredentialsFile(file, encryptionKey.current);
                setProgress({ current: i + 1, total: unencryptedFiles.length });
                
                // Add small delay to show progress
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            setStep("complete");
        } catch (e) {
            setError(`Failed to encrypt credentials: ${e instanceof Error ? e.message : String(e)}`);
            setStep("error");
        }
    };

    if (step === "scanning") {
        return (
            <Border>
                <Box flexDirection={"column"} gap={1}>
                    <Text color={"yellow"}>Scanning for unencrypted credentials...</Text>
                    <Text dimColor>This will check all .heimdell directories for unencrypted credentials.json files.</Text>
                </Box>
            </Border>
        );
    }

    if (step === "found") {
        return (
            <Border>
                <Box flexDirection={"column"} gap={1}>
                    <Text color={"yellow"}>Found {unencryptedFiles.length} unencrypted credential file(s):</Text>
                    
                    <Box flexDirection={"column"} marginY={1}>
                        {unencryptedFiles.map((file, index) => (
                            <Text key={index} color={"cyan"}>  • {file}</Text>
                        ))}
                    </Box>

                    <Text>Press Enter to start the encryption process...</Text>
                    <TextInput
                        placeholder="Press Enter to continue"
                        onSubmit={() => setStep("encrypt")}
                    />
                </Box>
            </Border>
        );
    }

    if (step === "encrypt") {
        return (
            <Border>
                <Box flexDirection={"column"} gap={1}>
                    <Text color={"yellow"}>Choose an encryption key for your credentials:</Text>
                    
                    {error && (
                        <Box>
                            <Text color={"red"}>⚠ {error}</Text>
                        </Box>
                    )}
                    <Text>Enter encryption key (minimum 7 characters):</Text>
                    <PasswordInput
                        placeholder="Encryption key"
                        onSubmit={(value) => {
                            encryptionKey.current = value;
                            handleInitialSubmit();
                        }}
                    />

                    <Box marginTop={1}>
                        <Text italic={true} dimColor={true}>
                            Note: You will need this key to access your credentials. Keep it secure!
                        </Text>
                    </Box>
                </Box>
            </Border>
        );
    }

    if (step === "confirm") {
        return (
            <Border>
                <Box flexDirection={"column"} gap={1}>
                    <Text color={"yellow"}>Confirm your encryption key:</Text>
                    
                    {error && (
                        <Box>
                            <Text color={"red"}>⚠ {error}</Text>
                        </Box>
                    )}

                    <Text>Re-enter encryption key:</Text>
                    <PasswordInput
                        key={"confirm"} // Reset input field
                        placeholder="Confirm encryption key"
                        onSubmit={(value) => {
                            confirmKey.current = value;
                            handleConfirmSubmit();
                        }}
                    />
                </Box>
            </Border>
        );
    }

    if (step === "encrypting") {
        return (
            <Border>
                <Box flexDirection={"column"} gap={1}>
                    <Text color={"yellow"}>Encrypting credentials...</Text>
                    
                    <Text>
                        Progress: {progress.current}/{progress.total} files encrypted
                    </Text>
                    
                    {progress.current < progress.total && (
                        <Text dimColor>
                            Encrypting: {unencryptedFiles[progress.current]}
                        </Text>
                    )}
                </Box>
            </Border>
        );
    }

    if (step === "complete") {
        const message = unencryptedFiles.length === 0 
            ? "No unencrypted credentials found. All your credentials are already encrypted or don't exist."
            : `Successfully encrypted ${unencryptedFiles.length} credential file(s)!`;
            
        return (
            <Border borderColor={"green"}>
                <Box flexDirection={"column"} gap={1}>
                    <Text color={"green"}>✓ Complete!</Text>
                    <Text>{message}</Text>
                    
                    {unencryptedFiles.length > 0 && (
                        <Box marginTop={1}>
                            <Text italic={true} dimColor={true}>
                                Your credentials are now securely encrypted. You will be prompted for 
                                the encryption key when using commands that require credentials.
                            </Text>
                        </Box>
                    )}
                </Box>
            </Border>
        );
    }

    if (step === "error") {
        return (
            <Border borderColor={"red"}>
                <Box flexDirection={"column"} gap={1}>
                    <Text color={"red"}>✗ Error</Text>
                    <Text color={"red"}>{error}</Text>
                </Box>
            </Border>
        );
    }

    return null;
}

export const useEncryptCredentialsCommand = (yargs: Argv) => {
    yargs.command(
        'encrypt-credentials',
        'Encrypt existing unencrypted credentials for enhanced security.',
        {},
        async function () {
            render(<EncryptCredentialsComponent />);
        },
    )
}