'use strict';
import { Box, Text } from "ink";
import { ConfirmInput, Spinner } from "@inkjs/ui";
import Border from "../../../components/Border.tsx";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import * as os from "node:os";
import type { Command } from "../../../types/command";
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

type PushUpdatePreTaskProps = {
    command: Command,
    onComplete: () => void
};

export default function PushUpdatePreTask(props: PushUpdatePreTaskProps) {
    const [status, setStatus] = useState<"ask-permission" | "running" | "done" | "error" | "killed">("ask-permission");
    const [log, setLogs] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const childProcessRef = useRef<ChildProcessWithoutNullStreams | null>(null);

    const confirm = () => setStatus("running");

    const platformSpecificCommand = useMemo(() => {
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
            const child = spawn(platformSpecificCommand, [], { shell: true });
            childProcessRef.current = child;

            child.stdout.on('data', (data: Buffer) => {
                setLogs(prevLogs => [...prevLogs, ...data.toString().trim().split('\n')]);
            });

            child.stderr.on('data', (data: Buffer) => {
                setLogs(prevLogs => [...prevLogs, ...data.toString().trim().split('\n').map(line => `STDERR: ${line}`)]);
            });

            child.on('error', (spawnError: Error) => {
                setError(`Failed to start command: ${spawnError.message}`);
                setLogs(prevLogs => [...prevLogs, `Failed to start command: ${spawnError.message}`]);
                setStatus("error");
                childProcessRef.current = null;
            });

            child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
                if (childProcessRef.current === child) {
                    childProcessRef.current = null;
                    if (status === "killed") {
                        return;
                    }
                    if (code === 0) {
                        setLogs(prevLogs => [...prevLogs, "Command completed successfully."]);
                        setStatus("done");
                        props.onComplete();
                    } else {
                        const exitMessage = `Command exited with ${code !== null ? `code ${code}` : `signal ${signal}`}`;
                        setError(exitMessage);
                        setLogs(prevLogs => [...prevLogs, exitMessage]);
                        setStatus("error");
                    }
                }
            });

        } catch (e: any) {
            setError(e?.message ?? "Unknown error setting up command execution.");
            setStatus("error");
            childProcessRef.current = null; // Ensure ref is cleared on setup error
        }
    }, [platformSpecificCommand, setLogs, setError, setStatus, props.onComplete, status]); // Added status to deps for timeout logic check

    useEffect(() => {
        let timeoutId: NodeJS.Timeout | null = null;

        if (status === "running") {
            runCommand();

            timeoutId = setTimeout(() => {
                if (childProcessRef.current && status === "running") {
                    setLogs((prev) => [...prev, "Killing process due to timeout (10s)."]);
                    childProcessRef.current.kill('SIGTERM');
                    setStatus("killed");
                    setError("Process killed due to timeout.");
                    childProcessRef.current = null;
                }
            }, 10 * 1000);
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            if (childProcessRef.current) {
                setLogs(prev => [...prev, "Process being cleaned up..."]);
                childProcessRef.current.kill('SIGTERM');
                childProcessRef.current = null;
            }
        };
    }, [status])

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

    if (status === "running" || status === "done" || status === "killed") {
        return (
            <Border borderColor={status === "done" ? "green" : (status === "killed" ? "yellow" : "blue")} width={"40%"}>
                <Box gap={1}>
                    {status === "running" && <Spinner/>}
                    <Text color={"magentaBright"} bold={true}>
                        {status === "running" && "RUNNING COMMAND"}
                        {status === "done" && "COMMAND COMPLETED"}
                        {status === "killed" && "COMMAND KILLED (TIMEOUT)"}
                    </Text>
                </Box>
                <Text italic={true}>
                    Running the command to prepare the update...
                </Text>
                <Text backgroundColor={"black"} color={"green"}>
                    {platformSpecificCommand}
                </Text>
                <Text>
                    This might take a while, please be patient.
                </Text>
                {log.length > 0 && (
                    <Border borderColor={"gray"} width={"100%"}>
                        <Text color={"yellow"} italic={true}>LOGS</Text>
                        <Text backgroundColor={"black"} color={"green"}>
                            {log.join("\n")}
                        </Text>
                    </Border>
                )}
                {error && (
                    <Border borderColor={"red"} width={"100%"}>
                        <Text color={"red"} italic={true}>ERROR</Text>
                        <Text backgroundColor={"black"} color={"red"}>
                            {error}
                        </Text>
                    </Border>
                )}
            </Border>
        );
    }

    if (status === "error") {
        return (
            <Border borderColor={"red"} width={"40%"}>
                <Box gap={1}>
                    <Text color={"red"} bold={true}>COMMAND FAILED</Text>
                </Box>
                <Text backgroundColor={"black"} color={"green"}>
                    {platformSpecificCommand}
                </Text>
                {log.length > 0 && (
                    <Border borderColor={"gray"} width={"100%"}>
                        <Text color={"yellow"} italic={true}>LOGS</Text>
                        <Text backgroundColor={"black"} color={"green"}>
                            {log.join("\n")}
                        </Text>
                    </Border>
                )}
                {error && (
                    <Border borderColor={"red"} width={"100%"} marginTop={1}>
                        <Text color={"red"} italic={true}>ERROR DETAILS</Text>
                        <Text backgroundColor={"black"} color={"red"}>
                            {error}
                        </Text>
                    </Border>
                )}
            </Border>
        )
    }


    return (
        <Border borderColor={"blue"} width={"40%"}>
            <Text color={"magentaBright"} bold={true}>PERMISSION TO RUN COMMAND</Text>
            <Text italic={true}>
                Heimdall wants to run the following command ({os.platform()} variant) to prepare the update:
            </Text>
            <Text backgroundColor={"black"} color={"green"}>{platformSpecificCommand}</Text>
            <Box>
                <Text>
                    If you are okay with us running the command, please type <Text bold={true}>y</Text>. (
                </Text>
                <ConfirmInput
                    onConfirm={confirm}
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
