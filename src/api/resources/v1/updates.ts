import {createResource, createRoute} from "@client.ts/core";
import type {Update} from "../../types/updates.ts";

export const updatesResource = createResource({
    prefix: "/api/v1/updates",
    routes: {
        get: createRoute<Update>().dynamic((platform: "ios" | "android", tag: string, version: string) => {
            return {
                route: `GET /${platform}/${version}?tag=${tag}`
            }
        })
    }
})
