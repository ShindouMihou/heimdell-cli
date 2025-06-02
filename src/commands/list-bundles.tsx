"use strict";
import type {Argv} from "yargs";
import {Box, render, Text} from "ink";
import {autoloadCredentials} from "../credentials/autoload.ts";
import UnauthenticatedAlert from "../components/UnauthenticatedAlert.tsx";
import {createHeimdellClient} from "../api/client.ts";
import {useMemo} from "react";
import {createQueryEngine} from "@client.ts/react";
import Border from "../components/Border.tsx";
import {Spinner} from "@inkjs/ui";
import {Table} from "@tqman/ink-table";

function ListBundlesCommand() {
    const client = useMemo(createHeimdellClient, []);
    const queryEngine = useMemo(() => createQueryEngine(client), [client]);
    const query = queryEngine.useImmediatelyFiringRoute("bundles", "list", globalThis.credentials!.tag);

    if (query.isLoading) {
        return (
            <Border borderColor={"yellow"}>
                <Box padding={1}>
                    <Spinner/>
                    <Text>Loading bundles...</Text>
                </Box>
            </Border>
        )
    }

    if (query.isError) {
        return (
            <Border borderColor={"red"}>
                <Text color={"red"} bold={true}>Failed to load bundles</Text>
                <Text color={"red"}>{query.error.message}</Text>
            </Border>
        )
    }

    return (
        <Table data={query.result!.data!.map(b => {
            const formatted = ({...b, status: b.is_disposed ? "ROLLED BACK" : "AVAILABLE"});
            delete formatted.is_disposed;
            return formatted;
        })}/>
    )
}
export const useListBundlesCommand = (yargs: Argv) => {
    yargs.command(
        'list-bundles',
        'List all bundles that were reserved in Heimdell.',
        () => {},
        async function () {
            await autoloadCredentials();
            if (globalThis.credentials == null) {
                render(<UnauthenticatedAlert/>)
                return;
            }

            render(<ListBundlesCommand/>);
        },
    )
}
