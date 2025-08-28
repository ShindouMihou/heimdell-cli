import {Box, Newline, Text} from "ink";
import {Badge, Spinner} from "@inkjs/ui";

type LoginStatusProps = {
    status: "idle" | "loading" | "ok" | "error";
    error: string | null;
    symlinkInfo?: {
        usingSymlinks: boolean;
        environment: string;
    };
};

export default function LoginStatus(props: LoginStatusProps) {
    const {status, error, symlinkInfo} = props;
    return (
        <>
            {status === "loading" && (
                <>
                    <Box gap={1}>
                        <Spinner/>
                        <Text bold={true}>Logging in...</Text>
                    </Box>
                    <Text italic={true}>
                        Please wait while we log you in. If it takes too long, please check your internet connection and try again.
                    </Text>
                </>
            )}
            {status === "ok" && (
                <Box flexDirection={"column"}>
                    <Text bold={true} color={"greenBright"}>LOGIN SUCCESSFUL</Text>
                    <Text italic={true}>
                        You can now use Heimdell to your heart's content.
                        <Newline/>
                        If you have any issues, please create an issue on our GitHub Repository.
                    </Text>
                    
                    {symlinkInfo && symlinkInfo.environment && (
                        <Box flexDirection={"column"} marginTop={1}>
                            {symlinkInfo.usingSymlinks ? (
                                <>
                                    <Box gap={1}>
                                        <Badge color={"green"}>✅ REAL-TIME SYNC</Badge>
                                        <Text>Credential sync enabled</Text>
                                    </Box>
                                    <Text italic={true}>
                                        You can edit credentials in either location:
                                        <Newline/>
                                        • .heimdell/credentials.json (main file)
                                        <Newline/>
                                        • .heimdell/{symlinkInfo.environment}/credentials.json (environment file)
                                        <Newline/>
                                        Changes to either file are immediately reflected in both locations
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Box gap={1}>
                                        <Badge color={"yellow"}>⚠️ FILE COPY MODE</Badge>
                                        <Text>System limitations detected</Text>
                                    </Box>
                                    <Text italic={true}>
                                        For real-time credential sync, enable Developer Mode on Windows or use a Unix system.
                                        <Newline/>
                                        With file copy mode:
                                        <Newline/>
                                        • Edit credentials in .heimdell/{symlinkInfo.environment}/credentials.json
                                        <Newline/>
                                        • Changes require running 'heimdall env {symlinkInfo.environment}' to become active
                                        <Newline/>
                                        • Avoid editing .heimdell/credentials.json directly as changes will be lost
                                    </Text>
                                </>
                            )}
                        </Box>
                    )}
                    
                    <Box gap={1} marginTop={1}>
                        <Badge color={"yellow"}>TIP</Badge>
                        <Text>Do not share the .heimdell folder on the project as it contains your credentials</Text>
                    </Box>
                </Box>
            )}
            {status === "error" && (
                <Box flexDirection={"column"}>
                    <Text bold={true} color={"red"}>ERROR OCCURRED: {error}</Text>
                    <Text italic={true}>
                        Please check your internet connection and try again.
                        If the problem persists, or is unrelated to your network connection,
                        please create an issue on our GitHub Repository.
                    </Text>
                </Box>
            )}
        </>
    )
}
