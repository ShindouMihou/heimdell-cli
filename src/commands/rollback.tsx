import Border from "../components/Border.tsx";
import type {Argv} from "yargs";
import {Box, render, Text} from "ink";
import UnauthenticatedAlert from "../components/UnauthenticatedAlert.tsx";
import {executeProtectedCommand} from "../utils/protectedCommand.tsx";
import {useEffect, useState} from "react";
import {ConfirmInput, Spinner, UnorderedList} from "@inkjs/ui";
import {createHeimdellClient} from "../api/client.ts";

function RollbackCommand({ tag }: { tag: string }) {
    const [confirmed, setConfirmed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rollbackStatus, setRollbackStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

    useEffect(() => {
        if (confirmed) {
            async function rollback() {
                const client = createHeimdellClient();

                try {
                    setRollbackStatus("loading");
                    const rollbackResult = await client.bundles.rollback({ tag });

                    if (rollbackResult.statusCode >= 200 && rollbackResult.statusCode < 300) {
                        setRollbackStatus("ok");
                        setError(null);
                    } else {
                        setRollbackStatus("error");
                        setError(`Failed to rollback bundle: ${(rollbackResult.data as any)?.error || `Unknown error (Status ${rollbackResult.statusCode})`}`);
                    }
                } catch (e) {
                    setError(`Failed to rollback bundle: ${e instanceof Error ? e.message : String(e)}`);
                    setRollbackStatus("error");
                    return;
                }
            }
            rollback();
        }
    }, [confirmed]);

    if (!confirmed) {
        return (
            <Border borderColor={"yellow"} width={"40%"}>
                <Text color={"redBright"} bold={true}>WARNING</Text>
                <Text italic={true}>
                    Rolling back an update will reverse the latest bundle for <Text bold={true}>{tag}</Text>, which will
                    affect all users of your application. This action cannot be undone.
                </Text>
                <Text italic={true}>
                    Please ensure that before you proceed with the rollback, you have considered the following:
                </Text>
                <UnorderedList>
                    <UnorderedList.Item>
                        <Text italic={true}>You are sure that the previous bundle is supported by your React Native app version.</Text>
                    </UnorderedList.Item>
                    <UnorderedList.Item>
                        <Text italic={true}>No massive configuration changes occurred between the current bundle and the previous bundle.</Text>
                    </UnorderedList.Item>
                </UnorderedList>
                <Box>
                    <Text>
                        If you are sure that you want to rollback the update, please type <Text bold={true}>y</Text>. (
                    </Text>
                    <ConfirmInput
                        onConfirm={() => setConfirmed(true)}
                        submitOnEnter={true}
                        onCancel={() => process.exit(0)}
                    />
                    <Text>
                        )
                    </Text>
                </Box>
            </Border>
        );
    }
    return (
        <Border
            borderColor={
                rollbackStatus === "ok" ? "green" :
                    rollbackStatus === "loading" ? "yellow" :
                        rollbackStatus === "error" ? "red" : "blue"
            }
            width={"40%"}
        >
            <Box gap={1}>
                {rollbackStatus === "loading" && <Spinner/>}
                <Text color={"magentaBright"} bold={true}>
                    {rollbackStatus === "loading" && "ROLLING BACK UPDATE"}
                    {rollbackStatus === "ok" && "ROLLBACK COMPLETED"}
                    {rollbackStatus === "error" && "ROLLBACK FAILED"}
                </Text>
            </Box>

            {rollbackStatus === "loading" && (
                <Text italic={true}>
                    Rolling back the latest update for <Text bold={true}>{tag}</Text>:
                </Text>
            )}

            {rollbackStatus === "ok" && (
                <Text italic={true}>
                    The previous bundle has been successfully rolled back. All users of your application will now
                    receive the previous update when they open the application.
                </Text>
            )}

            <UnorderedList>
                <UnorderedList.Item>
                    <Box gap={1}>
                        <Text>Rollback:</Text>
                        {rollbackStatus === "idle" && <Text italic={true} color={"yellow"}>Idle</Text>}
                        {rollbackStatus === "loading" && <Spinner/>}
                        {rollbackStatus === "ok" && <Text color={"green"}>OK</Text>}
                        {rollbackStatus === "error" && <Text color={"red"}>ERROR</Text>}
                    </Box>
                </UnorderedList.Item>
            </UnorderedList>

            {rollbackStatus === "loading" && (
                <Text>
                    This might take a while, please be patient.
                </Text>
            )}

            {error && (
                <Box padding={1} width={"80%"} flexDirection={"column"}>
                    <Text color={"red"} italic={true} bold={true}>ERROR DETAILS</Text>
                    <Text color={"red"}>
                        {error}
                    </Text>
                </Box>
            )}
        </Border>
    )
}

export const useRollbackCommand = (yargs: Argv) => {
    yargs.command(
        'rollback',
        'Rolls back the latest update.',
        () => {},
        async function () {
            await executeProtectedCommand('rollback', () => {
                if (globalThis.credentials == null) {
                    render(<UnauthenticatedAlert/>)
                    return;
                }

                const tag = globalThis.credentials.tag;
                render(<RollbackCommand tag={tag}/>);
            });
        },
    )
}
