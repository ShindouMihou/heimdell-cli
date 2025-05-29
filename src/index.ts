import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {useLoginCommand} from "./commands/login.tsx";

const cli = yargs()
    .scriptName("heimdell")
    .usage('$0 <cmd> [args]')
    .help();

useLoginCommand(cli);
cli.parse(hideBin(process.argv));
