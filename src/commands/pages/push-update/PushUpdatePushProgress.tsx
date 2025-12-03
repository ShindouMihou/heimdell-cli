import Border from "../../../components/Border.tsx";
import {Box, Text} from "ink";
import {Spinner, UnorderedList} from "@inkjs/ui";
import {useEffect, useMemo, useRef, useState} from "react";
import {createHeimdellClient} from "../../../api/client.ts";
import type {Bundle} from "../../../api/types/bundle.ts";
import {uploadBundleFile} from "../../../api/resources/v1/upload.ts";
import {checkSentryAvailability, uploadSourceMapToSentry} from "../../../utils/sentry.ts";
import fs from "node:fs";
import path from "node:path";

type ChecklistStatus = "idle" | "running" | "ok" | "not-good" | "error";
export default function PushUpdatePushProgress(props: {
    targetVersion: string,
    note: string | null,
    onComplete: () => void
}) {
    const [error, setError] = useState<string | null>(null);
    const bundle = useRef(null as Bundle | null);

    const [checklist, setChecklist] = useState([
        {
            name: "Reserve bundle version",
            status: "idle" as ChecklistStatus,
            task: async () => {
                const client = createHeimdellClient();
                const credentials = globalThis.credentials!;
                const reserve = await client.bundles.reserve({
                    version: props.targetVersion,
                    tag: credentials.tag,
                    note: props.note ?? undefined
                });

                if (reserve.statusCode !== 200) {
                    setError("Failed to reserve bundle version: " + (reserve.data?.error ?? `Unknown error (Status ${reserve.statusCode})`));
                    return "error" as ChecklistStatus;
                }

                if (reserve.data !== null) {
                    bundle.current = reserve.data;
                }
                return "ok" as ChecklistStatus;
            }
        },
        {
            name: "Push bundles to Heimdell",
            status: "idle" as ChecklistStatus,
            task: async () => {
                if (bundle.current == null) {
                    setError("No bundle reserved. Please try again.");
                    return "error" as ChecklistStatus;
                }

                const platforms = globalThis.credentials!.platforms;
                const isAndroid = platforms.includes("android");
                const isIos = platforms.includes("ios");

                if (!isAndroid && !isIos) {
                    setError("No platforms selected for the bundle. Please select at least one platform.");
                    return "error" as ChecklistStatus;
                }

                try {
                    await uploadBundleFile(
                        bundle.current.id,
                        isAndroid ? Bun.file("dist/hermes.android.hbc.zip") : undefined,
                        isIos ? Bun.file("dist/hermes.ios.hbc.zip") : undefined
                    );

                    // Clean up local bundle files
                    if (isAndroid) {
                        Bun.file("dist/hermes.android.hbc.zip").delete();
                    }

                    if (isIos) {
                        Bun.file("dist/hermes.ios.hbc.zip").delete();
                    }
                } catch (e) {
                    setError("Failed to upload bundle files: " + (e instanceof Error ? e.message : String(e)));
                    return "error" as ChecklistStatus;
                }

                return "ok" as ChecklistStatus;
            }
        }
    ]);

    useEffect(() => {
        checkSentryAvailability(process.cwd()).then((available) => {
            if (available && checklist.length === 2) {
                setChecklist(prev => [
                    ...prev,
                    {
                        name: "Upload sourcemaps to Sentry",
                        status: "idle" as ChecklistStatus,
                        task: async () => {
                            const platforms = globalThis.credentials!.platforms;
                            const isAndroid = platforms.includes("android");
                            const isIos = platforms.includes("ios");
                            const projectRoot = process.cwd();

                            try {
                                if (isAndroid && fs.existsSync("dist/sentry/index.android.bundle") && fs.existsSync("dist/sentry/index.android.bundle.map")) {
                                    await uploadSourceMapToSentry({
                                        bundlePath: path.resolve("dist/sentry/index.android.bundle"),
                                        sourceMapPath: path.resolve("dist/sentry/index.android.bundle.map"),
                                        release: props.targetVersion,
                                        platform: "android",
                                        projectRoot
                                    });
                                }

                                if (isIos && fs.existsSync("dist/sentry/main.ios.jsbundle") && fs.existsSync("dist/sentry/main.ios.jsbundle.map")) {
                                    await uploadSourceMapToSentry({
                                        bundlePath: path.resolve("dist/sentry/main.ios.jsbundle"),
                                        sourceMapPath: path.resolve("dist/sentry/main.ios.jsbundle.map"),
                                        release: props.targetVersion,
                                        platform: "ios",
                                        projectRoot
                                    });
                                }

                                // Clean up Sentry files
                                if (fs.existsSync("dist/sentry")) {
                                    fs.rmSync("dist/sentry", { recursive: true });
                                }
                            } catch (e) {
                                setError("Failed to upload sourcemaps to Sentry: " + (e instanceof Error ? e.message : String(e)));
                                return "error" as ChecklistStatus;
                            }

                            return "ok" as ChecklistStatus;
                        }
                    }
                ]);
            }
        });
    }, []);

    const status = useMemo(() => {
        if (checklist.every(item => item.status === "ok")) {
            return "done";
        }
        if (checklist.some(item => item.status === "running")) {
            return "running";
        }
        if (checklist.some(item => item.status === "error" || item.status === "not-good")) {
            return "error";
        }
        return "running";
    }, [checklist]);

    const [currentTask, setCurrentTask] = useState(0);

    useEffect(() => {
        async function runTask() {
            const currentChecklist = checklist[currentTask];
            if (!currentChecklist) return;

            setChecklist(prev => {
                const newChecklist = [...prev];
                newChecklist[currentTask]!.status = "running";
                return newChecklist;
            });

            const result = await currentChecklist.task();
            setTimeout(async () => {
                setChecklist(prev => {
                    const newChecklist = [...prev];
                    newChecklist[currentTask]!.status = result;
                    return newChecklist;
                });

                if (result === "not-good") {
                    setError("The task '" + currentChecklist.name + "' did not complete successfully. Please check the logs for more details.");
                }

                if (result === "ok") {
                    setCurrentTask(prev => prev + 1);
                }
            }, 1_000);
        }
        runTask();
    }, [currentTask]);

    return (
        <Border
            borderColor={
                status === "done" ? "green" :
                    status === "running" ? "yellow" :
                        status === "error" ? "red" : "blue"
            }
            width={"60%"}
        >
            <Box gap={1}>
                {status === "running" && <Spinner/>}
                <Text color={"magentaBright"} bold={true}>
                    {status === "running" && "PUSHING UPDATE"}
                    {status === "done" && "UPDATE PUSHED"}
                    {status === "error" && "UPDATE FAILED"}
                </Text>
            </Box>

            {status === "running" && (
                <Text italic={true}>
                    Performing the following tasks to push the update to Heimdell:
                </Text>
            )}

            {status === "done" && (
                <Text italic={true}>
                    The JavaScript bundles are deployed to Heimdell. All users opening the application
                    will receive the update, and will be applied the next time they open the application.
                </Text>
            )}

            <UnorderedList>
                {checklist.map((item, index) => (
                    <UnorderedList.Item key={index}>
                        <Box gap={1}>
                            <Text>{item.name}:</Text>
                            {item.status === "idle" && <Text italic={true} color={"yellow"}>Idle</Text>}
                            {item.status === "running" && <Spinner/>}
                            {item.status === "ok" && <Text color={"green"}>OK</Text>}
                            {item.status === "not-good" && <Text color={"red"}>Not Good</Text>}
                        </Box>
                    </UnorderedList.Item>
                ))}
            </UnorderedList>

            {status === "running" && (
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
    );
}
