export type RuleArgument = string | string[];
export interface Rule {
    name: string;
    message: string;
    validate(value: string, argument: RuleArgument): boolean;
}

export type Ruleset = Rule[];