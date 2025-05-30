import type {Argv} from "yargs";
import {render} from "ink";
import {autoloadCredentials} from "../credentials/autoload.ts";
import UnauthenticatedAlert from "../components/UnauthenticatedAlert.tsx";
import {useMemo, useState} from "react";
import PushUpdateWarning from "./pages/push-update/PushUpdateWarning.tsx";
import PushUpdatePreviewTasks from "./pages/push-update/PushUpdatePreviewTasks.tsx";
import PushUpdatePreTask from "./pages/push-update/PushUpdatePreTask.tsx";
import type {Command} from "../types/command";
import {bundleAndroidScript, bundleIosScript} from "../scripts/hermes.ts";
import {installPackagesScript} from "../scripts/package-manager.ts";
import {useRuntime} from "../hooks/useRuntime.ts";
import PushUpdateCheckups from "./pages/push-update/PushUpdateCheckups.tsx";

function PushUpdateCommand()  {
    const [page, setPage] = useState(0);

    const {runtime, useRuntimeCommand} = useRuntime();
    const installPackagesCommand = useRuntimeCommand(installPackagesScript);
    const bundleAndroidCommand = useRuntimeCommand(bundleAndroidScript);
    const bundleIosCommand = useRuntimeCommand(bundleIosScript);

    const commands = useMemo(() => {
        const cmds: Command[] = [installPackagesCommand];
        const platforms = globalThis.credentials!.platforms;
        if (platforms.includes("android")) {
            cmds.push(bundleAndroidCommand);
        }
        if (platforms.includes("ios")) {
            cmds.push(bundleIosCommand);
        }
        return cmds;
    }, []);

    const [currentCommand, setCurrentCommand] = useState(0);

    return (
        <>
            {page === 0 && (
                <PushUpdateWarning onConfirm={() => {
                    setPage(1)
                }}/>
            )}
            {page === 1 && (
                <PushUpdatePreviewTasks
                    runtime={runtime}
                    onConfirm={() => {
                        setPage(2)
                    }}
                />
            )}
            {page === 2 && (
                <PushUpdatePreTask
                    key={`pre-task-${currentCommand}`}
                    command={commands[currentCommand]!}
                    onComplete={() => {
                        if (currentCommand < commands.length - 1) {
                            setCurrentCommand(prev => prev + 1);
                        } else {
                            setPage(3);
                        }
                    }}
                />
            )}
            {page === 3 && (
                <PushUpdateCheckups onComplete={() => {
                    setPage(4);
                }}/>
            )}
        </>
    )
}

export const usePushUpdateCommand = (yargs: Argv) => {
    yargs.command(
        'push-update',
        'Pushes an update into Heimdell. ' +
        'This will run all the necessary React Native commands to create a bundle before pushing it to Heimdell.',
        (yargs) => {},
        async function () {
            await autoloadCredentials();
            if (globalThis.credentials == null) {
                render(<UnauthenticatedAlert/>)
                return;
            }

            render(<PushUpdateCommand/>)
        },
    )
}
