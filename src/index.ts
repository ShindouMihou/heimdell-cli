#!/usr/bin/env bun
import yargs, {type Argv} from 'yargs';
import { hideBin } from 'yargs/helpers';
import {useLoginCommand} from "./commands/login.tsx";
import {usePushUpdateCommand} from "./commands/push-update.tsx";
import {useListBundlesCommand} from "./commands/list-bundles.tsx";
import {useRollbackCommand} from "./commands/rollback.tsx";
import {useEnvCommand} from "./commands/env.tsx";
import {useHashCommand} from "./commands/hash.ts";
import {useEncryptCredentialsCommand} from "./commands/encrypt-credentials.tsx";
import {useRulesetCreateCommand} from "./commands/ruleset-create.ts";

const cli = yargs()
    .scriptName("heimdell")
    .usage('$0 <cmd> [args]')
    .option('use-ci', {
        type: 'string',
        describe: 'Run in CI/CD mode with JSON output. Reads config from HEIMDELL_CONFIG env var. Optional flags: parallel (e.g. --use-ci=parallel)',
        global: true
    })
    .middleware(async (argv) => {
        if (argv['use-ci'] !== undefined) {
            const { executeCIMode } = await import('./ci/index.ts');
            const flags = typeof argv['use-ci'] === 'string' ? argv['use-ci'] : '';
            await executeCIMode(argv._[0] as string, argv as Record<string, unknown>, flags);
        }
    }, true)
    .help();

([
    useLoginCommand,
    usePushUpdateCommand,
    useListBundlesCommand,
    useRollbackCommand,
    useEnvCommand,
    useHashCommand,
    useEncryptCredentialsCommand,
    useRulesetCreateCommand
] as ((yargs: Argv) => void)[])
    .forEach(e => e(cli));

cli.parse(hideBin(process.argv));
