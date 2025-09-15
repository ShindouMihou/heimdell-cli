import type {Rule, RuleArgument} from "./type";

export const globalRules: Map<string, Rule> = new Map([
    [
        "eq", {
            name: "eq",
            message: "{value} must be equal to any of the following: {argument}",
            validate: (value: string, argument: RuleArgument) =>
                typeof argument === "string" ? value === argument : argument.includes(value)
        }
    ],
    [
        "!eq", {
            name: "!eq",
            message: "{value} must not be equal to any of the following: {argument}",
            validate: (value: string, argument: RuleArgument) =>
                typeof argument === "string" ? value !== argument : !argument.includes(value)
        }
    ],
    [
        "contains", {
            name: "contains",
            message: "{value} must be contain any of the following: {argument}",
            validate: (value: string, argument: RuleArgument) =>
                typeof argument === "string" ? value.includes(argument) : argument.some(arg => value.includes(arg))
        }
    ],
    [
        "!contains", {
            name: "!contains",
            message: "{value} must not contain any of the following: {argument}",
            validate: (value: string, argument: RuleArgument) =>
                typeof argument === "string" ? !value.includes(argument) : argument.every(arg => !value.includes(arg))
        }
    ],
    [
        "matches", {
            name: "matches",
            message: "{value} must match the regex pattern: {argument}",
            validate: (value: string, argument: RuleArgument) => {
                if (typeof argument !== "string") {
                    throw new Error("Argument for regex must be a string.");
                }
                const regex = new RegExp(argument);
                return regex.test(value);
            }
        }
    ],
    [
        "!matches", {
            name: "!matches",
            message: "{value} must not match the regex pattern: {argument}",
            validate: (value: string, argument: RuleArgument) => {
                if (typeof argument !== "string") {
                    throw new Error("Argument for regex must be a string.");
                }
                const regex = new RegExp(argument);
                return !regex.test(value);
            }
        }
    ],
]);