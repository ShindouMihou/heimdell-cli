import {createClient, createHook, createRoute} from "@client.ts/core";
import {updatesResource} from "./resources/v1/updates.ts";
import {cliResource} from "./resources/v1/cli.ts";

export const createHeimdellClient =
    (baseUrl: string, auth: { username: string, password: string }) => createClient(baseUrl, {
        updates: updatesResource,
        bundles: cliResource,
        auth: {
            prefix: "/api/v1/auth",
            routes: {
                login: createRoute().dynamic(() => {
                    return {
                        route: "GET /login",
                        decoder: body => body
                    }
                })
            }
        }
    }, {
        hooks: [
            createHook({
                beforeRequest: (request) =>  request.merge({
                    headers: {
                        'Authorization': `Basic ${btoa(`${auth.username}:${auth.password}`)}`
                    }
                })
            })
        ]
    })
