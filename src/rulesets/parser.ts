import {type RulesetConfig, RulesetConfigSchema} from "./valibot.ts";
import * as v from 'valibot';
import {globalRules} from "./globalRules.ts";

export type RulesetEvaluationError = {
  message: string,
  issues?: v.SafeParseResult<typeof RulesetConfigSchema>['issues']
} | {
  valid: false,
  rule: string,
  ruleMessage: string,
  errorMessage?: string
} | Error | any;

export async function evaluateRuleset(ruleset: string) {
  if (!globalThis.credentials) {
    throw new Error("Credentials are not loaded. Please load the environment variables first.");
  }

  const rulesetData = JSON.parse(ruleset);
  delete rulesetData.$schema; // Remove $schema if present
  const rulesetConfigParseResult = v.safeParse(RulesetConfigSchema, rulesetData);
  if (!rulesetConfigParseResult.success) {
    throw {
      message: "Ruleset config is invalid.",
      issues: rulesetConfigParseResult.issues
    }
  }

  const rulesetConfig: RulesetConfig = rulesetConfigParseResult.output;
  const environment = globalThis.credentials.environment || "default";

  const rulesetElement = rulesetConfig[environment];
  if (!rulesetElement) {
    // No ruleset for the current environment, allow by default.
    return true;
  }

  const envFilePath = rulesetElement.$uses || ".env";
  const envFile = Bun.file(envFilePath);

  if (!await envFile.exists()) {
    throw new Error(`Environment file ${envFilePath} does not exist. Cannot apply rulesets.`);
  }

  const env = require('dotenv').parse(await envFile.text());
  const ensureEntries = Object.entries(rulesetElement.ensure);
  for (const [key, ruleArgs] of ensureEntries) {
    let value = key;
    if (value.startsWith("project.env.")) {
        const envKey = value.slice("project.env.".length);
        value = env[envKey];
        if (value === undefined) {
            throw new Error(`Environment variable ${envKey} is not defined in ${envFilePath}.`);
        }
    } else if (value.startsWith("project.")) {
      const project = {
        tag: globalThis.credentials.tag,
        environment: globalThis.credentials.environment || "default",
        platforms: globalThis.credentials.platforms,
        username: globalThis.credentials.username,
        baseUrl: globalThis.credentials.baseUrl,
      };
      const projectKey = value.slice("project.".length);
      value = (project as any)[projectKey];
    }

    for (const [ruleName, argument] of Object.entries(ruleArgs)) {
      const rule = globalRules.get(ruleName.toLowerCase());
      if (!rule) {
        throw new Error(`Rule ${ruleName} is not a valid rule.`);
      }

      const valid = rule.validate(value, argument);
      if (!valid) {
        const message = rule.message
          .replace("{value}", value)
          .replace("{argument}", Array.isArray(argument) ? argument.join(", ") : argument);
        throw {
          valid: false,
          rule: ruleName,
          ruleMessage: message,
          errorMessage: rulesetElement.error?.message
        };
      }
    }
  }

  return true;
}