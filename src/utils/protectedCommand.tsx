import {render} from "ink";
import {useState} from "react";
import EncryptionKeyPrompt from "../components/EncryptionKeyPrompt.tsx";
import {SessionManager} from "./session.ts";
import {loadCredentials} from "../credentials/autoload.ts";

export async function executeProtectedCommand(
    commandName: string,
    commandFunction: () => Promise<void> | void
): Promise<void> {
    const sessionManager = SessionManager.getInstance();
    
    // Check if we already have a key from the terminal session
    if (sessionManager.hasEncryptionKey()) {
        try {
            await loadCredentials(".heimdell/credentials.json");
            // If successful, execute the command
            await commandFunction();
            return;
        } catch (error) {
            // Key is invalid, clear it and continue to prompt
            console.log("Stored encryption key is invalid. Please re-enter your encryption key.");
        }
    }
    
    try {
        // Try to load credentials without key (in case they're not encrypted)
        await loadCredentials(".heimdell/credentials.json");
        // If successful, execute the command
        await commandFunction();
    } catch (error) {
        if (error instanceof Error && 
            (error.message.includes("encryption key") || 
             error.message.includes("Invalid encryption key"))) {
            
            // Need to prompt for encryption key
            return new Promise((resolve, reject) => {
                const PromptComponent = () => {
                    const [keyPrompted, setKeyPrompted] = useState(false);
                    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

                    const handleKeySubmit = async (key: string) => {
                        try {
                            // Set the key in session manager (this automatically saves it)
                            sessionManager.setEncryptionKey(key);
                            
                            // Try to load credentials with the new key
                            await loadCredentials(".heimdell/credentials.json");
                            setKeyPrompted(true);
                            
                            // Execute the original command now that we have the key
                            await commandFunction();
                            
                            resolve();
                        } catch (loadError) {
                            if (loadError instanceof Error && 
                                loadError.message.includes("Invalid encryption")) {
                                // Wrong key, clear it and show error
                                sessionManager.clearEncryptionKey();
                                setErrorMessage("Invalid encryption key. Please try again.");
                                // Re-render with error message
                                render(<PromptComponent />);
                            } else {
                                reject(loadError);
                            }
                        }
                    };

                    if (keyPrompted) {
                        return null;
                    }

                    return (
                        <EncryptionKeyPrompt
                            onSubmit={handleKeySubmit}
                            message={`Command '${commandName}' requires encrypted credentials. Please enter your encryption key:`}
                            error={errorMessage}
                        />
                    );
                };

                render(<PromptComponent />);
            });
        } else {
            // Some other error, just throw it
            throw error;
        }
    }
}

export function createProtectedCommand(
    commandName: string,
    commandFunction: () => Promise<void> | void
): () => Promise<void> {
    return async () => {
        await executeProtectedCommand(commandName, commandFunction);
    };
}