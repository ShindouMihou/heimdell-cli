import {useMemo} from "react";
import {checkJsRuntime, PlatformSpecificScript} from "../scripts/runtime.ts";

export const useRuntime = () => {
    const runtime = useMemo(checkJsRuntime, []);

    const useRuntimeCommand =
        (script: PlatformSpecificScript) => useMemo(() => script.using(runtime), [runtime, script]);

    return {
        runtime,
        useRuntimeCommand
    } as const;
}
