'use strict';
import { Box, Text } from "ink";
import { ConfirmInput, Spinner } from "@inkjs/ui";
import Border from "../../../components/Border.tsx";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import * as os from "node:os";
import type { Command } from "../../../types/command";
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

const MAX_LOG_LINES = 5;

type PushUpdatePreTaskProps = {
    command: Command,
    onComplete: () => void | Promise<void>
};

export default function PushUpdatePreTask(props: PushUpdatePreTaskProps) {
    const [status, setStatus] = useState<"ask-permission" | "running" | "done" | "error" | "killed">("ask-permission");
    const [log, setLogs] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const childProcessRef = useRef<ChildProcessWithoutNullStreams | null>(null);

    const [isCompletionAcknowledged, setIsCompletionAcknowledged] = useState(false);

    const handleConfirmPermission = () => setStatus("running");

    const platformSpecificCommand = useMemo(() => {
        if (typeof props.command === "string") {
            return props.command;
        }
        const platform = os.platform();
        if (platform === "darwin") return props.command.darwin;
        if (platform === "win32") return props.command.win32;
        if (platform === "linux") return props.command.linux;
        return null;
    }, [props.command]);

    const runCommand = useCallback(async () => {
        if (!platformSpecificCommand) {
            setError("Command not defined for this platform.");
            setStatus("error");
            return;
        }
        setError(null);

        try {
            const child = spawn(platformSpecificCommand, [], { shell: true, stdio: 'pipe' });
            childProcessRef.current = child;

            child.stdout.on('data', (data: Buffer) => {
                const newLines = data.toString().trim().split('\n').filter(Boolean);
                if (newLines.length > 0) {
                    setLogs(prevLogs => [...prevLogs, ...newLines].slice(-MAX_LOG_LINES));
                }
            });

            child.stderr.on('data', (data: Buffer) => {
                const newLines = data.toString().trim().split('\n').filter(Boolean).map(line => `STDERR: ${line}`);
                if (newLines.length > 0) {
                    setLogs(prevLogs => [...prevLogs, ...newLines].slice(-MAX_LOG_LINES));
                }
            });

            child.on('error', (spawnError: Error) => {
                const errorMessage = `Failed to start command: ${spawnError.message}`;
                setError(errorMessage);
                setLogs(prevLogs => [...prevLogs, errorMessage].slice(-MAX_LOG_LINES));
                setStatus("error");
                if (childProcessRef.current === child) {
                    childProcessRef.current = null;
                }
            });

            child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
                if (childProcessRef.current === child) {
                    childProcessRef.current = null;
                    if (code === 0) {
                        setLogs(prevLogs => [...prevLogs, "Command completed successfully."].slice(-MAX_LOG_LINES));
                        setStatus("done");
                    } else {
                        const exitMessage = `Command exited with ${code !== null ? `code ${code}` : `signal ${signal}`}`;
                        setError(exitMessage);
                        setLogs(prevLogs => [...prevLogs, exitMessage].slice(-MAX_LOG_LINES));
                        setStatus("error");
                    }
                }
            });

        } catch (e: any) {
            const errorMessage = e?.message ?? "Unknown error setting up command execution.";
            setError(errorMessage);
            setLogs(prevLogs => [...prevLogs, errorMessage].slice(-MAX_LOG_LINES))
            setStatus("error");
            childProcessRef.current = null;
        }
    }, [platformSpecificCommand]);


    useEffect(() => {
        let timeoutId: NodeJS.Timeout | null = null;

        if (status === "running") {
            runCommand();

            timeoutId = setTimeout(() => {
                setStatus(currentStatus => {
                    if (currentStatus === "running" && childProcessRef.current) {
                        const procToKill = childProcessRef.current;
                        childProcessRef.current = null;

                        const timeoutMessage = "Killing process due to timeout (10s).";
                        setLogs((prev) => [...prev, timeoutMessage].slice(-MAX_LOG_LINES));

                        procToKill.kill('SIGTERM');

                        setError("Process killed due to timeout.");
                        return "killed";
                    }
                    return currentStatus;
                });
            }, 60 * 1000 * 10);
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            if (childProcessRef.current) {
                setLogs((prev) => [...prev, "Cleaning up active command (unmount/status change)..."].slice(-MAX_LOG_LINES));
                childProcessRef.current.kill('SIGTERM');
                childProcessRef.current = null;
            }
        };
    }, [status, runCommand]);


    const handleCompletionConfirm = async () => {
        setIsCompletionAcknowledged(true);
        try {
           props.onComplete();
        } catch (e) {
            setError(`Error during onComplete: ${e instanceof Error ? e.message : String(e)}`);
        }
    };

    const handleCancel = () => {
        if (childProcessRef.current) {
            childProcessRef.current.kill('SIGTERM');
        }
        process.exit(0);
    };

    if (platformSpecificCommand == null) {
        return (
            <Border borderColor={"red"} width={"40%"}>
                <Text color={"magentaBright"} bold={true}>UNSUPPORTED OPERATING SYSTEM</Text>
                <Text italic={true}>
                    This command is unsupported for your operating system. Please try again on a supported operating system (Linux, Windows, macOS).
                </Text>
            </Border>
        );
    }

    if (status === "running" || status === "done" || status === "killed" || (status === "error" && platformSpecificCommand)) {
        return (
            <Border
                borderColor={
                    status === "done" ? "green" :
                        status === "killed" ? "yellow" :
                            status === "error" ? "red" : "blue"
                }
                width={"40%"}
            >
                <Box gap={1}>
                    {status === "running" && <Spinner/>}
                    <Text color={"magentaBright"} bold={true}>
                        {status === "running" && "RUNNING COMMAND"}
                        {status === "done" && "COMMAND COMPLETED"}
                        {status === "killed" && "COMMAND KILLED (TIMEOUT)"}
                        {status === "error" && "COMMAND FAILED"}
                    </Text>
                </Box>

                {status !== "error" && (
                    <Text italic={true}>
                        Running the command to prepare the update...
                    </Text>
                )}

                <Text backgroundColor={"black"} color={"green"}>
                    {platformSpecificCommand}
                </Text>

                {status === "running" && (
                    <Text>
                        This might take a while, please be patient.
                    </Text>
                )}

                {log.length > 0 && (
                    <Border borderColor={"gray"} width={"100%"}>
                        <Text color={"yellow"} italic={true}>LOGS (last {MAX_LOG_LINES})</Text>
                        <Text backgroundColor={"black"} color={"green"}>
                            {log.join("\n")}
                        </Text>
                    </Border>
                )}

                {error && (
                    <Border borderColor={"red"} width={"100%"}>
                        <Text color={"red"} italic={true}>{status === "error" ? "ERROR DETAILS" : "ERROR"}</Text>
                        <Text backgroundColor={"black"} color={"red"}>
                            {error}
                        </Text>
                    </Border>
                )}

                {status === "done" && !isCompletionAcknowledged && (
                    <Box marginTop={1}>
                        <Text>
                            This task is completed. To continue, please type <Text bold={true}>y</Text> and enter twice. (
                        </Text>
                        <ConfirmInput
                            onConfirm={handleCompletionConfirm}
                            onCancel={handleCancel}
                        />
                        <Text>
                            )
                        </Text>
                    </Box>
                )}
                {status === "done" && isCompletionAcknowledged && (
                    <Text color="cyan">Completion acknowledged. Waiting for next step or app exit...</Text>
                )}
            </Border>
        );
    }

    return (
        <Border borderColor={"blue"} width={"40%"}>
            <Text color={"magentaBright"} bold={true}>PERMISSION TO RUN COMMAND</Text>
            <Text italic={true}>
                Heimdell wants to run the following command ({os.platform()} variant) to prepare the update:
            </Text>
            <Text backgroundColor={"black"} color={"green"}>{platformSpecificCommand}</Text>
            <Box>
                <Text>
                    If you are okay with us running the command, please type <Text bold={true}>y</Text>. (
                </Text>
                <ConfirmInput
                    onConfirm={handleConfirmPermission}
                    onCancel={handleCancel}
                />
                <Text>
                    )
                </Text>
            </Box>
        </Border>
    );
}
