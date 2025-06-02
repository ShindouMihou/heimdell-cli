#!/usr/bin/env bun
import yargs, {type Argv} from 'yargs';
import { hideBin } from 'yargs/helpers';
import {useLoginCommand} from "./commands/login.tsx";
import {usePushUpdateCommand} from "./commands/push-update.tsx";
import {useListBundlesCommand} from "./commands/list-bundles.tsx";
import {useRollbackCommand} from "./commands/rollback.tsx";

const cli = yargs()
    .scriptName("heimdell")
    .usage('$0 <cmd> [args]')
    .help();

([
    useLoginCommand,
    usePushUpdateCommand,
    useListBundlesCommand,
    useRollbackCommand
] as ((yargs: Argv) => void)[])
    .forEach(e => e(cli));

cli.parse(hideBin(process.argv));
