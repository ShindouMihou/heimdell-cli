import Border from "../../../components/Border.tsx";
import {Box, Text} from "ink";
import {ConfirmInput, Spinner, UnorderedList} from "@inkjs/ui";
import {useEffect, useMemo, useState} from "react";
import fs from "node:fs";

type ChecklistStatus = "idle" | "checking" | "ok" | "not-good" | "error";
export default function PushUpdateCheckups(props: { onComplete: () => void }) {
    const [error, setError] = useState<string | null>(null);

    const [checklist, setChecklist] = useState(() => {
        const platforms = globalThis.credentials!.platforms;
        const list = [];
        if (platforms.includes("android")) {
            list.push({
                name: "Android Bundle",
                status: "checking",
                task: (): ChecklistStatus => {
                    try {
                        const exists = fs.existsSync("dist/hermes.android.hbc.zip");
                        if (!exists) {
                            return "not-good";
                        }
                        return "ok";
                    } catch (e) {
                        setError(error);
                        return "error";
                    }
                }
            });
        }

        if (platforms.includes("ios")) {
            list.push({
                name: "iOS Bundle",
                status: "idle",
                task: (): ChecklistStatus => {
                    try {
                        const exists = fs.existsSync("dist/hermes.ios.hbc.zip");
                        if (!exists) {
                            return "not-good";
                        }
                        return "ok";
                    } catch (e) {
                        setError(error);
                        return "not-good";
                    }
                }
            });
        }

        return list;
    });

    const status = useMemo(() => {
        if (checklist.every(item => item.status === "ok")) {
            return "done";
        }
        if (checklist.some(item => item.status === "checking")) {
            return "checking";
        }
        if (checklist.some(item => item.status === "error" || item.status === "not-good")) {
            return "error";
        }
        return "running";
    }, [checklist]);

    const [currentTask, setCurrentTask] = useState(0);

    useEffect(() => {
        const currentChecklist = checklist[currentTask];
        if (!currentChecklist) return;

        setChecklist(prev => {
            const newChecklist = [...prev];
            newChecklist[currentTask]!.status = "checking";
            return newChecklist;
        });

        const result = currentChecklist.task();
        setTimeout(() => {
            setChecklist(prev => {
                const newChecklist = [...prev];
                newChecklist[currentTask]!.status = result;
                return newChecklist;
            });

            if (result === "not-good") {
                setError("One of the platforms doesn't have a proper bundle. Please try the command again, or report the issue if persist.");
            }

            if (result === "ok") {
                setCurrentTask(prev => prev + 1);
            }
        }, 1_000);
    }, [currentTask]);

    return (
        <Border
            borderColor={
                status === "done" ? "green" :
                    status === "checking" ? "yellow" :
                        status === "error" ? "red" : "blue"
            }
            width={"60%"}
        >
            <Box gap={1}>
                {status === "running" && <Spinner/>}
                <Text color={"magentaBright"} bold={true}>
                    {status === "checking" && "CHECKING BUNDLES"}
                    {status === "done" && "READY TO UPLOAD"}
                    {status === "error" && "BUNDLE CHECKING FAILED"}
                </Text>
            </Box>

            {status === "checking" && (
                <Text italic={true}>
                    Checking if the JavaScript bundles are ready to be uploaded to Heimdell server.
                </Text>
            )}

            {status === "done" && (
                <Text italic={true}>
                    The JavaScript bundles are ready to be deployed to Heimdell. Please note that once
                    deployed, all users will be required to download the latest update.
                </Text>
            )}

            <UnorderedList>
                {checklist.map((item, index) => (
                    <UnorderedList.Item key={index}>
                        <Box gap={1}>
                            <Text>{item.name}:</Text>
                            {item.status === "idle" && <Text italic={true} color={"yellow"}>Idle</Text>}
                            {item.status === "checking" && <Spinner/>}
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

            {status === "done" && (
                <Box marginTop={1}>
                    <Text>
                        To continue, please type <Text bold={true}>y</Text> and enter twice. (
                    </Text>
                    <ConfirmInput
                        onConfirm={props.onComplete}
                        onCancel={() => process.exit(0)}
                    />
                    <Text>
                        )
                    </Text>
                </Box>
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
