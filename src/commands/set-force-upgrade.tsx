import Border from "../components/Border.tsx";
import type {Argv} from "yargs";
import {Box, render, Text} from "ink";
import UnauthenticatedAlert from "../components/UnauthenticatedAlert.tsx";
import {executeProtectedCommand} from "../utils/protectedCommand.tsx";
import {useEffect, useState} from "react";
import {ConfirmInput, Spinner, UnorderedList} from "@inkjs/ui";
import {createHeimdellClient} from "../api/client.ts";

type RequestStatus = "idle" | "loading" | "ok" | "error";

function SetForceUpgradeCommand({bundleId, enable, autoYes}: { bundleId: string, enable: boolean, autoYes: boolean }) {
    const [confirmed, setConfirmed] = useState(autoYes);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<RequestStatus>("idle");

    useEffect(() => {
        if (!confirmed) {
            return;
        }

        async function run() {
            const client = createHeimdellClient();

            try {
                setStatus("loading");
                const result = await client.bundles.setForceUpgrade({bundleId, enabled: enable});

                if (result.statusCode >= 200 && result.statusCode < 300) {
                    setStatus("ok");
                    setError(null);
                } else {
                    setStatus("error");
                    setError(
                        `Failed to update force-upgrade flag: ${(result.data as { error?: string } | null)?.error ?? `Unknown error (Status ${result.statusCode})`}`
                    );
                }
            } catch (e) {
                setError(`Failed to update force-upgrade flag: ${e instanceof Error ? e.message : String(e)}`);
                setStatus("error");
            }
        }

        run();
    }, [confirmed, bundleId, enable]);

    if (!confirmed) {
        return (
            <Border borderColor={enable ? "red" : "yellow"} width={"60%"}>
                <Text color={enable ? "redBright" : "yellowBright"} bold={true}>
                    {enable ? "WARNING — FORCE UPGRADE" : "CLEAR FORCE UPGRADE"}
                </Text>
                <Text italic={true}>
                    {enable ? (
                        <>
                            You are about to mark bundle <Text bold={true}>{bundleId}</Text> as a mandatory
                            upgrade. All users on an older bundle for the same version+tag will be required
                            to update before they can continue using your application.
                        </>
                    ) : (
                        <>
                            You are about to clear the force-upgrade flag on bundle <Text bold={true}>{bundleId}</Text>.
                            Users who have not yet upgraded past it will no longer be forced to do so.
                        </>
                    )}
                </Text>
                <UnorderedList>
                    <UnorderedList.Item>
                        <Text italic={true}>
                            {enable
                                ? "Use force-upgrade only for critical fixes (security, data integrity, severe crashes)."
                                : "Confirm this bundle is no longer critical before clearing the flag."}
                        </Text>
                    </UnorderedList.Item>
                    <UnorderedList.Item>
                        <Text italic={true}>This action can be reversed with the opposite command.</Text>
                    </UnorderedList.Item>
                </UnorderedList>
                <Box>
                    <Text>
                        If you are sure you want to proceed, please type <Text bold={true}>y</Text>. (
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
                status === "ok" ? "green" :
                    status === "loading" ? "yellow" :
                        status === "error" ? "red" : "blue"
            }
            width={"60%"}
        >
            <Box gap={1}>
                {status === "loading" && <Spinner/>}
                <Text color={"magentaBright"} bold={true}>
                    {status === "loading" && (enable ? "ENABLING FORCE UPGRADE" : "CLEARING FORCE UPGRADE")}
                    {status === "ok" && (enable ? "FORCE UPGRADE ENABLED" : "FORCE UPGRADE CLEARED")}
                    {status === "error" && "OPERATION FAILED"}
                </Text>
            </Box>

            {status === "ok" && (
                <Text italic={true}>
                    {enable
                        ? <>Bundle <Text bold={true}>{bundleId}</Text> is now marked as a force-upgrade. Users on older bundles will be required to update on their next update check.</>
                        : <>The force-upgrade flag on bundle <Text bold={true}>{bundleId}</Text> has been cleared.</>}
                </Text>
            )}

            <UnorderedList>
                <UnorderedList.Item>
                    <Box gap={1}>
                        <Text>Status:</Text>
                        {status === "idle" && <Text italic={true} color={"yellow"}>Idle</Text>}
                        {status === "loading" && <Spinner/>}
                        {status === "ok" && <Text color={"green"}>OK</Text>}
                        {status === "error" && <Text color={"red"}>ERROR</Text>}
                    </Box>
                </UnorderedList.Item>
            </UnorderedList>

            {error && (
                <Box padding={1} width={"80%"} flexDirection={"column"}>
                    <Text color={"red"} italic={true} bold={true}>ERROR DETAILS</Text>
                    <Text color={"red"}>
                        {error}
                    </Text>
                </Box>
            )}
        </Border>
    );
}

export const useSetForceUpgradeCommand = (yargs: Argv) => {
    yargs.command(
        'set-force-upgrade <bundleId>',
        'Mark an existing bundle as a force-upgrade, or clear the flag with --disable. ' +
        'Users on any older bundle for the same version+tag will be required to update.',
        (yargs) => {
            yargs.positional('bundleId', {
                type: 'string',
                describe: 'The ID of the bundle to flag'
            });
            yargs.option({
                'disable': {
                    describe: "Clear the force-upgrade flag instead of setting it.",
                    type: "boolean",
                    default: false,
                    alias: "d"
                }
            });
            yargs.option({
                'yes': {
                    describe: "Skip the confirmation prompt; assume \"yes\" as the answer. " +
                        "Intended for automation and scripted usage.",
                    type: "boolean",
                    default: false,
                    alias: "y"
                }
            });
            yargs.demandOption(['bundleId'], 'You must provide a bundle ID.');
        },
        async function (args) {
            const bundleId = args.bundleId as string;
            const enable = !(args.disable as boolean);
            const autoYes = args.yes as boolean;

            await executeProtectedCommand('set-force-upgrade', () => {
                if (globalThis.credentials == null) {
                    render(<UnauthenticatedAlert/>);
                    return;
                }
                render(<SetForceUpgradeCommand bundleId={bundleId} enable={enable} autoYes={autoYes}/>);
            });
        },
    );
};
