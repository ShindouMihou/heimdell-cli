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
import PushUpdatePushProgress from "./pages/push-update/PushUpdatePushProgress.tsx";

function PushUpdateCommand(
    { targetVersion, note }: {
        targetVersion: string,
        note: string | null
    }
)  {
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
            {page === 4 && (
                <PushUpdatePushProgress
                    targetVersion={targetVersion}
                    note={note}
                    onComplete={() => {}}
                />
            )}
        </>
    )
}

const semanticVersionRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/gm;

export const usePushUpdateCommand = (yargs: Argv) => {
    yargs.command(
        'push-update <targetVersion>',
        'Pushes an update into Heimdell. ' +
        'This will run all the necessary React Native commands to create a bundle before pushing it to Heimdell.',
        (yargs) => {
            yargs.positional('targetVersion', {
                alias: 'v',
                type: 'string',
                describe: 'The version for this bundle'
            });
            yargs.positional('note', {
                alias: 'n',
                type: 'string',
                describe: 'A note for this bundle, e.g. "Bug fixes and performance improvements"'
            })
            yargs.check((argv) => {
                if (!argv.targetVersion) {
                    throw new Error('You must provide a target version for the update.');
                }
                if (!semanticVersionRegex.test(argv.targetVersion as string)) {
                    throw new Error('Invalid version format. Please use semantic versioning (e.g., 1.0.0).');
                }
                if (argv.note && (argv.note as string).length > 100) {
                    throw new Error('Note must be less than 100 characters.');
                }
                return true;
            })
            yargs.demandOption(['targetVersion'], 'You must provide a target version for the update.');
        },
        async function (args) {
            const targetVersion = args.targetVersion as string;
            const note = args.note as string;
            await autoloadCredentials();
            if (globalThis.credentials == null) {
                render(<UnauthenticatedAlert/>)
                return;
            }

            render(
                <PushUpdateCommand
                    targetVersion={targetVersion}
                    note={note}
                />
            )
        },
    )
}
