import type {Argv} from "yargs";
import {render} from "ink";
import {autoloadCredentials} from "../credentials/autoload.ts";
import UnauthenticatedAlert from "../components/UnauthenticatedAlert.tsx";
import {useState} from "react";

function PushUpdateCommand()  {
    const [page, setPage] = useState(0);
    const [tag, setTag] = useState<string | null>(null);
}

export const usePushUpdateCommand = (yargs: Argv) => {
    yargs.command(
        'push-update',
        'Pushes an update into Heimdall. ' +
        'This will run all the necessary React Native commands to create a bundle before pushing it to Heimdall.',
        (yargs) => {},
        async function () {
            await autoloadCredentials();
            if (globalThis.credentials == null) {
                render(<UnauthenticatedAlert/>)
                return;
            }
        },
    )
}
