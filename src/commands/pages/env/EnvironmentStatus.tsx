import {Box, Newline, Text} from "ink";
import {Badge, Spinner} from "@inkjs/ui";

type EnvironmentStatusProps = {
    status: "idle" | "loading" | "ok" | "error",
    error: string | null,
    loadingMessage?: string,
    successMessage?: string
}

export default function EnvironmentStatus(props: EnvironmentStatusProps) {
    const {status, error} = props;
    return (
        <>
            {status === "loading" && (
                <>
                    <Box gap={1}>
                        <Spinner/>
                        <Text bold={true}>{props.loadingMessage || "Loading..."}</Text>
                    </Box>
                    <Text italic={true}>
                        Please wait while we load your credentials. If it takes too long, please check your internet connection and try again.
                    </Text>
                </>
            )}
            {status === "ok" && (
                <Box flexDirection={"column"}>
                    <Text bold={true} color={"greenBright"}>{props.successMessage || "OPERATION SUCCESSFUL"}</Text>
                    <Text italic={true}>
                        {props.successMessage ? "Environment switched successfully. You can now use Heimdell with the new environment." : "You can now use Heimdell to your heart's content."}
                        <Newline/>
                        If you have any issues, please create an issue on our GitHub Repository.
                    </Text>
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
