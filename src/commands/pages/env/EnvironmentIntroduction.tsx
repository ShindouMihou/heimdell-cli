import {Box, Text} from "ink";
import {ConfirmInput, Badge} from "@inkjs/ui";

export default function EnvironmentIntroduction(props: {
    onConfirm: () => void,
    environment: string,
    credentials: typeof globalThis.credentials,
}) {
    return (
        <>
            <Text>Environment Switch: <Text bold={true} color={"cyanBright"}>{props.environment}</Text></Text>
            <Text italic={true}>
                You are about to switch to the <Text bold={true} color={"cyanBright"}>{props.environment}</Text> environment.
                This will change your active Heimdell server configuration.
            </Text>
            <Box flexDirection={"column"} padding={1} borderStyle="round" borderColor="gray">
                <Text bold={true} color={"yellowBright"}>Target Environment Details:</Text>
                <Box marginTop={1}>
                    <Text color={"gray"}>• </Text>
                    <Text bold={true}>Username: </Text>
                    <Text color={"white"}>{props.credentials?.username || 'N/A'}</Text>
                </Box>
                <Box>
                    <Text color={"gray"}>• </Text>
                    <Text bold={true}>Server: </Text>
                    <Text color={"white"}>{props.credentials?.baseUrl || 'N/A'}</Text>
                </Box>
                <Box>
                    <Text color={"gray"}>• </Text>
                    <Text bold={true}>Project Tag: </Text>
                    <Text color={"white"}>{props.credentials?.tag || 'N/A'}</Text>
                </Box>
                <Box>
                    <Text color={"gray"}>• </Text>
                    <Text bold={true}>Platforms: </Text>
                    <Text color={"white"}>{props.credentials?.platforms?.join(', ') || 'N/A'}</Text>
                </Box>
            </Box>
            <Box gap={1} flexDirection={"column"}>
                <Badge color={"red"}>WARNING</Badge>
                <Text>This will replace your current active environment configuration</Text>
            </Box>
            <Box>
                <Text>
                    Continue with environment switch? (
                </Text>
                <ConfirmInput
                    onConfirm={props.onConfirm}
                    submitOnEnter={true}
                    onCancel={() => process.exit(0)}
                />
                <Text>
                    )
                </Text>
            </Box>
        </>
    )
}
