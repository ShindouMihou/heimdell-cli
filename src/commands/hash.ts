import type {Argv} from "yargs";

export const useHashCommand = (yargs: Argv) => {
    yargs.command(
        'hash <value>',
        'Hashes a given value using Argon2id algorithm, suitable for passwords in Heimdell configuration.',
        (yargs) => {
            yargs.positional('value', {
                alias: 'v',
                type: 'string',
                describe: 'The value to be hashed, e.g. a password'
            });
            yargs.check((argv) => {
                if (!argv.value) {
                    throw new Error('You must provide a value to hash.');
                }
                return true;
            })
            yargs.demandOption(['value'], 'You must provide a value to hash.');
        },
        async function (args) {
            const value = args.value as string;
            console.log(Bun.password.hashSync(value));
        },
    )
}
