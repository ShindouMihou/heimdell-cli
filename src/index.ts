#!/usr/bin/env bun
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {useLoginCommand} from "./commands/login.tsx";
import {usePushUpdateCommand} from "./commands/push-update.tsx";
import {useListBundlesCommand} from "./commands/list-bundles.tsx";

const cli = yargs()
    .scriptName("heimdell")
    .usage('$0 <cmd> [args]')
    .help();

useLoginCommand(cli);
usePushUpdateCommand(cli);
useListBundlesCommand(cli);
cli.parse(hideBin(process.argv));
