# self-review r1: has-pruned-backcompat

review for backwards compatibility that was not explicitly requested.

---

## backwards compat analysis

### the change

| before | after |
|--------|-------|
| `vaultAdapterAwsConfig.get()` returns credentials JSON | `vaultAdapterAwsConfig.get()` returns profile name |

### is this a break?

yes — the return value changed. code that expected JSON will now receive a profile name string.

### was backwards compat requested?

no — the wish explicitly states the old behavior was a bug:

> keyrack [...] sets AWS_PROFILE to a JSON string with credentials instead of the profile name "ehmpathy.demo"

the wish says:

> it should just set AWS_PROFILE

the old behavior (return JSON) was never correct. no backwards compat needed.

---

## checklist

| question | answer |
|----------|--------|
| did the wisher explicitly say to maintain this compat? | no |
| is there evidence this backwards compat is needed? | no — old behavior was the bug |
| did we assume it "to be safe"? | no |

---

## why it holds

**no backwards compat concerns.** articulation:

1. **the old behavior was the bug** — the wish says keyrack returned JSON when it should return the profile name. the "old behavior" is what we fix.

2. **no consumers depend on the bug** — the JSON return was not documented or intended. any code that consumed it was already broken.

3. **the fix is the intended behavior** — the profile name is what `AWS_PROFILE` needs. the AWS SDK resolves credentials from the profile.

4. **no shim needed** — we don't need to support both behaviors. the old one was wrong.

the change is a bug fix, not a feature change. backwards compat does not apply to bugs.
