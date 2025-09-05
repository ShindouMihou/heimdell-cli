import {Box, Text} from "ink";
import {useRef, useState} from "react";
import {PasswordInput} from "@inkjs/ui";

export default function LoginEnterEncryptionKey(props: {
    onSubmit: (encryptionKey: string) => void;
}) {
    const encryptionKey = useRef("");
    const confirmKey = useRef("");

    const [step, setStep] = useState<"initial" | "confirm">("initial");
    const [error, setError] = useState<string | null>(null);

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
            setStep("initial");
            encryptionKey.current = "";
            confirmKey.current = "";
            return;
        }
        props.onSubmit(encryptionKey.current);
    };

    return (
        <Box flexDirection={"column"} gap={1}>
            <Text>
                <Text color={"green"} bold={true}>✓</Text> Login successful!
            </Text>
            
            <Text>
                For security, your credentials will be encrypted. Please choose an encryption key:
            </Text>

            {error && (
                <Box>
                    <Text color={"red"}>⚠ {error}</Text>
                </Box>
            )}

            {step === "initial" && (
                <Box flexDirection={"column"} gap={1}>
                    <Text color={"yellow"}>Enter encryption key (minimum 7 characters):</Text>
                    <PasswordInput
                        onChange={(text) => (encryptionKey.current = text)}
                        onSubmit={handleInitialSubmit}
                        placeholder="Encryption key"
                    />
                </Box>
            )}

            {step === "confirm" && (
                <Box flexDirection={"column"} gap={1}>
                    <Text color={"yellow"}>Confirm encryption key:</Text>
                    <PasswordInput
                        key={"confirm"} // Reset input field
                        onChange={(text) => (confirmKey.current = text)}
                        onSubmit={handleConfirmSubmit}
                        placeholder="Confirm encryption key"
                    />
                </Box>
            )}

            <Box marginTop={1}>
                <Text italic={true} dimColor={true}>
                    Note: You will need this key to access your credentials. Keep it secure!
                </Text>
            </Box>
        </Box>
    );
}