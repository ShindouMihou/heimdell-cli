import type {Argv} from "yargs";
import {render} from "ink";
import UnauthenticatedAlert from "../components/UnauthenticatedAlert.tsx";
import {executeProtectedCommand} from "../utils/protectedCommand.tsx";
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

type PushUpdateCommandProps = {
    targetVersion: string,
    note: string | null,
    autoYes: boolean,
    skipNpmInstall?: boolean,
};

function PushUpdateCommand({targetVersion, note, autoYes = false, skipNpmInstall = false }: PushUpdateCommandProps)  {
    const [page, setPage] = useState(0);

    const {runtime, useRuntimeCommand} = useRuntime();
    const installPackagesCommand = useRuntimeCommand(installPackagesScript);
    const bundleAndroidCommand = useRuntimeCommand(bundleAndroidScript);
    const bundleIosCommand = useRuntimeCommand(bundleIosScript);

    const commands = useMemo(() => {
        const cmds: Command[] = skipNpmInstall ? [] : [installPackagesCommand];
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
                <PushUpdateWarning
                    onConfirm={() => {
                        if (autoYes) {
                            setPage(2);
                            return;
                        }

                        setPage(1)
                    }}
                />
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
                    autoYes={autoYes}
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
        'push-update <targetVersion> [note]',
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
            yargs.option({
                'yes': {
                    describe: "Automatic yes to prompts; assume \"yes\" as answer to all prompts and run non-interactively. " +
                        "This won't apply to the final step which uploads the bundle to Heimdell as a safety measure.",
                    type:  "boolean",
                    alias: "y",
                    default: false
                }
            })
            yargs.option({
                'skip-npm-install': {
                    describe: "Skip the npm install step. Use this if you are sure that your node_modules are up to date.",
                    type:  "boolean",
                    default: false,
                    alias: "sni"
                }
            })
            yargs.option({
                'auto': {
                    describe: "Run the command in fully automatic mode. This will skip all prompts and run non-interactively. " +
                        "This will not run npm install and will assume that your node_modules are up to date. Like the --yes flag, " +
                        "this won't apply to the final step which uploads the bundle to Heimdell as a safety measure.",
                    type: "boolean",
                    default: false,
                    alias: "a"
                }
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
            
            await executeProtectedCommand('push-update', async () => {
                if (globalThis.credentials == null) {
                    render(<UnauthenticatedAlert/>)
                    return;
                }

                const auto = args.auto as boolean;
                const autoYes = args.yes as boolean || auto;
                const skipNpmInstall = args['skip-npm-install'] as boolean || auto;
                render(
                    <PushUpdateCommand
                        targetVersion={targetVersion}
                        note={note}
                        autoYes={autoYes}
                        skipNpmInstall={skipNpmInstall}
                    />
                )
            });
        },
    )
}
