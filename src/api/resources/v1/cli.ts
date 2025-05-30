import {createHook, createResource, createRoute} from "@client.ts/core";
import type {ReserveBundle} from "../../types/reserve-bundle.ts";
import type {Bundle, BundleArray} from "../../types/bundle.ts";

export const cliResource = createResource({
    prefix: "/api/v1/cli",
    routes: {
        reserve: createRoute<Bundle>().dynamic((payload: ReserveBundle) => {
            return {
                route: "POST /bundle/reserve",
                body: {
                    tag: payload.tag,
                    version: payload.version,
                    note: payload.note
                },
                headers: {
                    "Content-Type": "application/json"
                },
                encoder: JSON.stringify
            }
        }),
        list: createRoute<BundleArray>().dynamic((tag: string) => {
            return {
                route: `GET /bundles/${tag}/list`,
            }
        }),
    }
})
