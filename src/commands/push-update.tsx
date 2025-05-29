import type {Argv} from "yargs";
import {render} from "ink";
import {autoloadCredentials} from "../credentials/autoload.ts";
import UnauthenticatedAlert from "../components/UnauthenticatedAlert.tsx";
import {useState} from "react";
import PushUpdateWarning from "./pages/push-update/PushUpdateWarning.tsx";
import PushUpdatePreviewTasks from "./pages/push-update/PushUpdatePreviewTasks.tsx";
import PushUpdatePreTask from "./pages/push-update/PushUpdatePreTask.tsx";
import type {Command} from "../types/command";
import * as fs from "node:fs";

const createHermesBundleAndroidCommand =  (platform: "win32" | "darwin" | "linux") => {
    const hermes = platform === "win32" ? "win64-bin" : platform === "darwin" ? "osx-bin" : "linux64-bin";
    return `mkdir -p dist/android && npx expo export:embed --platform android --minify=true --entry-file index.tsx --bundle-output dist/android/index.android.bundle --dev false  --assets-dest dist/android && ./node_modules/react-native/sdks/hermesc/${hermes}/hermesc -emit-binary -out dist/android/index.android.hbc.bundle dist/android/index.android.bundle -output-source-map -w && rm -f dist/android/index.android.bundle dist/android/index.android.hbc.bundle.map && cd dist && find android -type f | zip hermes.android.hbc.zip -@ && cd .. && rm -rf dist/android`
}

const createHermesBundleIosCommand = (platform: "win32" | "darwin" | "linux") => {
    const hermes = platform === "win32" ? "win64-bin" : platform === "darwin" ? "osx-bin" : "linux64-bin";
    return `mkdir -p dist/ios && npx expo export:embed --platform ios --minify=true --entry-file index.tsx --bundle-output dist/ios/main.jsbundle --dev false --assets-dest dist/ios && ./node_modules/react-native/sdks/hermesc/${hermes}/hermesc -emit-binary -out dist/ios/main.ios.hbc.jsbundle dist/ios/main.jsbundle -output-source-map -w && rm -f dist/ios/main.jsbundle dist/ios/main.ios.hbc.jsbundle.map && cd dist && find ios -type f | zip hermes.ios.hbc.zip -@ && cd .. && rm -rf dist/ios`
}

const createPlatformSpecificNodeInstall = () => {
    const isBun = fs.existsSync("bun.lock");
    const isYarn = fs.existsSync("yarn.lock");
    if (isBun) {
        return "bun install";
    } else if (isYarn) {
        return "yarn install";
    } else {
        return "npm install";
    }
}

const nodeInstallCommand = createPlatformSpecificNodeInstall();

function PushUpdateCommand()  {
    const [page, setPage] = useState(0);
    const commands = [
        {
            win32: nodeInstallCommand,
            darwin: nodeInstallCommand,
            linux: nodeInstallCommand,
        },
        {
            win32: createHermesBundleAndroidCommand("win32"),
            darwin: createHermesBundleAndroidCommand("darwin"),
            linux: createHermesBundleAndroidCommand("linux"),
        },
        {
            win32: createHermesBundleIosCommand("win32"),
            darwin: createHermesBundleIosCommand("darwin"),
            linux: createHermesBundleIosCommand("linux"),
        },
    ] as Command[];
    return (
        <>
            {page === 0 && (
                <PushUpdateWarning onConfirm={() => {
                    setPage(1)
                }}/>
            )}
            {page === 1 && (
                <PushUpdatePreviewTasks onConfirm={() => {
                    setPage(2)
                }}/>
            )}
            {page === 2 && (
                <PushUpdatePreTask
                    command={commands[0]!}
                    onComplete={() => {}}
                />
            )}
        </>
    )
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

            render(<PushUpdateCommand/>)
        },
    )
}
