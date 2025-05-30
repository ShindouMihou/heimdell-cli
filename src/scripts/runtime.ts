import fs from "node:fs";
import os from "node:os";

export type JsRuntime = "node" | "bun" | "yarn" | "deno";
export const checkJsRuntime = (): JsRuntime => {
    if (fs.existsSync("bun.lock")) {
        return "bun";
    } else if (fs.existsSync("yarn.lock")) {
        return "yarn";
    } else if (fs.existsSync("deno.lock")) {
        return "deno";
    } else {
        return "node";
    }
}

export const createPlatformSpecificScript = (scripts: {
    win32: string,
    linux: string,
    darwin?: string
}) => {
    const platform = os.platform();
    if (platform === "win32") {
        return scripts.win32;
    }

    if (platform === "darwin" && scripts.darwin) {
        return scripts.darwin;
    }

    // Unless provided, we assume that the Linux and Darwin commands are the same
    // as they both are based on the GNU ecosystem.
    return scripts.linux;
}

export class PlatformSpecificScript {
    script: string;

    constructor(scripts: {
        win32: string,
        linux: string,
        darwin?: string
    }) {
        this.script = createPlatformSpecificScript(scripts);
    }

    using(runtime: JsRuntime) {
        if (runtime === "node") {
            return this.script.replace(/\$x/g, "npx").replace(/\$m/g, "npm");
        } else if (runtime === "bun") {
            return this.script.replace(/\$x/g, "bunx").replace(/\$m/g, "bun");
        } else if (runtime === "yarn") {
            return this.script.replace(/\$x/g, "npx").replace(/\$m/g, "yarn");
        } else if (runtime === "deno") {
            return this.script.replace(/\$x/g, "deno run").replace(/\$m/g, "deno");
        }
        return this.script;
    }
}
