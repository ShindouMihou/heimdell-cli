import {PlatformSpecificScript} from "./runtime.ts";

export const installPackagesScript = new PlatformSpecificScript({
    win32: "$m install",
    darwin: "$m install",
    linux: "$m install",
})
