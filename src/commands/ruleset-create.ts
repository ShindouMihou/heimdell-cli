import type {Argv} from "yargs";

const templateRulesetJson = JSON.stringify({
    "$schema": "https://gist.githubusercontent.com/ShindouMihou/bfd45833d9fc078d7b234d65a6d5fa2c/raw/2e1b9ec3126484558e8fa0b7006a937e4fe1f047/heimdell-ruleset-schema.json",
    "write-your-environment-name-here": {
        "ensure": {
            "project.env.BASE_URL": {
                "!contains": ["staging"]
            },
        },
        "error": {
            "message": "The BASE_URL must not contain the word 'staging' in this environment."
        }
    },
    "another-environment-if-needed": {
    }
}, null, 2)

export const useRulesetCreateCommand = (yargs: Argv) => {
    yargs.command(
        'ruleset-create',
        'Creates a ruleset JSON file for the project. This cannot overwrite an existing ruleset.',
        () => {
        },
        async function () {
            const rulesetFile = Bun.file(".heimdell/ruleset.json");
            if (await rulesetFile.exists()) {
                console.error("A ruleset.json file already exists in the .heimdell directory. Please delete the ruleset manually.");
                return;
            }

            await rulesetFile.write(templateRulesetJson);
            console.log("We've created a new ruleset.json file in the .heimdell directory. You can now edit it to define your deployment rules.");
        },
    )
}
