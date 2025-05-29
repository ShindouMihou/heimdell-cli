import {createResource, createRoute} from "@client.ts/core";
import type {ReserveBundle} from "../../types/reserve-bundle.ts";
import type {BundleArray} from "../../types/bundle.ts";

export const cliResource = createResource({
    prefix: "/api/v1/cli",
    routes: {
        reserve: createRoute().dynamic((payload: ReserveBundle) => {
            return {
                route: "POST /bundle/reserve",
                body: {
                    tag: payload.tag,
                    version: payload.version,
                    note: payload.note
                },
                encoder: JSON.stringify
            }
        }),
        list: createRoute<BundleArray>().dynamic((tag: string) => {
            return {
                route: `GET /bundles/${tag}/list/`
            }
        }),
    }
})
