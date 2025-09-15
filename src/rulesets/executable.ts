import {evaluateRuleset, type RulesetEvaluationError} from "./parser.ts";

export async function validateRuleset(): Promise<boolean> {
    const rulesetFile = Bun.file(".heimdell/ruleset.json");
    if (await rulesetFile.exists()) {
        let ok = false;
        try {
            ok = await evaluateRuleset(await rulesetFile.text());
        } catch (e: RulesetEvaluationError) {
            if (e.issues) {
                console.error(e.message);
                console.error("Issues:");
                console.log(e.issues)
                for (const issue of e.issues) {
                    console.error(`- ${issue.message} at ${issue.path.join(".")}`);
                }
            } else if ('valid' in e && !e.valid) {
                console.error(`Ruleset evaluation failed for rule '${e.rule}': ${e.ruleMessage}`);
                if (e.errorMessage) {
                    console.error(`Error: ${e.errorMessage}`);
                }
            } else if (e instanceof Error) {
                console.error(`Error during ruleset evaluation: ${e.message}`);
            }
        }
        return ok;
    }
    return true;
}