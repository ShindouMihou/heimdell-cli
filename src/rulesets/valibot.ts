import * as v from 'valibot';
export const RulesetElementSchema = v.object({
    $uses: v.optional(v.string()),
    ensure: v.record(
        v.string(),
        v.record(
            v.string(),
            v.union([v.string(), v.array(v.string())])
        )
    ),
    error: v.optional(
        v.object({
            message: v.string()
        })
    )
});
export const RulesetConfigSchema = v.record(v.string(), RulesetElementSchema);

export type RulesetConfig = v.InferInput<typeof RulesetConfigSchema>;