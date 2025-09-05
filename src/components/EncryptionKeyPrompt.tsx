import {Box, Text} from "ink";
import {PasswordInput} from "@inkjs/ui";
import {useRef, useState} from "react";
import Border from "./Border.tsx";

export default function EncryptionKeyPrompt(props: {
    onSubmit: (key: string) => void;
    onCancel?: () => void;
    message?: string;
    error?: string;
}) {
    const encryptionKey = useRef("");
    const [localError, setLocalError] = useState<string | null>(null);
    
    // Use external error if provided, otherwise use local error
    const error = props.error || localError;

    const handleSubmit = () => {
        if (encryptionKey.current.trim().length === 0) {
            setLocalError("Encryption key cannot be empty");
            return;
        }
        setLocalError(null);
        props.onSubmit(encryptionKey.current);
    };

    const defaultMessage = "Your credentials are encrypted. Please enter your encryption key to continue:";

    return (
        <Border>
            <Box flexDirection={"column"} gap={1}>
                <Text color={"yellow"}>
                    🔐 Encrypted Credentials
                </Text>
                
                <Text>{props.message || defaultMessage}</Text>

                {error && (
                    <Box>
                        <Text color={"red"}>⚠ {error}</Text>
                    </Box>
                )}

                <Box flexDirection={"column"} gap={1}>
                    <Text>Encryption key:</Text>
                    <PasswordInput
                        onChange={(text) => (encryptionKey.current = text)}
                        onSubmit={handleSubmit}
                        placeholder="Enter encryption key"
                    />
                </Box>

                <Box marginTop={1}>
                    <Text italic={true} dimColor={true}>
                        This key will be cached for the duration of your terminal session.
                    </Text>
                </Box>

                {props.onCancel && (
                    <Box marginTop={1}>
                        <Text dimColor={true}>Press Ctrl+C to cancel</Text>
                    </Box>
                )}
            </Box>
        </Border>
    );
}