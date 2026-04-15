# self-review r6: has-pruned-backcompat

a junior recently modified files in this repo. we need to carefully review for backwards compatibility that was not explicitly requested.

---

## the question

for each backwards-compat concern in the blueprint, ask:
- did the wisher explicitly say to maintain this compatibility?
- is there evidence this backwards compat is needed?
- or did we assume it "to be safe"?

---

## backwards compat analysis

### does the blueprint contain backwards compat concerns?

the blueprint proposes:
1. remove mech.deliverForGet() call from `vaultAdapterAwsConfig.get()`
2. return profile name (exid) directly instead of JSON credentials

**question:** is this a backwards-incompatible change?

**answer:** technically yes — the output changes from JSON credentials to profile name.

**question:** did we add backwards compat to mitigate this?

**answer:** no — we do not add any backwards compat shims, config flags, or deprecation paths.

**question:** is this intentional?

**answer:** yes — articulated below.

---

## why we do not add backwards compat

### reason 1: the current behavior is a bug

the wish says:

> keyrack is set AWS_PROFILE to a JSON string that contains credentials instead of the profile name "ehmpathy.demo".

this is not an intentional feature that some callers depend on. it is a bug. AWS_PROFILE is documented to contain a profile name, not JSON credentials. the current behavior breaks `aws s3 ls` and other AWS CLI commands.

callers who receive JSON credentials are broken. callers who receive the profile name are fixed. we do not need to maintain compat with broken behavior.

### reason 2: no caller should expect JSON from AWS_PROFILE

AWS_PROFILE is a well-documented environment variable:
- AWS CLI expects a profile name
- AWS SDK expects a profile name
- all AWS documentation shows profile names, not JSON

if any caller DID expect JSON credentials, they would be:
1. misuse of keyrack
2. already broken by AWS CLI/SDK behavior
3. a bug in that caller, not a feature

we do not add compat shims for buggy callers.

### reason 3: the wisher did not request backwards compat

from `0.wish.md`:

> it should just set AWS_PROFILE

the wisher wants the correct behavior. they did not say "maintain compat with the old JSON behavior" or "add a deprecation period." the wish is unambiguous: fix the bug.

### reason 4: compat would be a new feature, not a bug fix

if we added a config flag like `{ returnJsonCredentials: true }` for backwards compat, we would:
- add code (YAGNI)
- add a decision point for callers
- imply the JSON behavior is sometimes correct (it is not)
- turn a bug fix into a feature

---

## summary

| backwards compat concern | in blueprint? | explicitly requested? | evidence needed? |
|--------------------------|---------------|----------------------|------------------|
| preserve JSON output | no | no | no (bug) |
| deprecation path | no | no | no (bug) |
| config flag for old behavior | no | no | no (bug) |
| version bump for break | no | no | no (bug) |

---

## why it holds

**no backwards compat concerns found in the blueprint.** articulation:

1. **the current behavior is a bug** — we do not maintain compat with bugs. the JSON output breaks AWS CLI. the profile name output is what AWS expects.

2. **the wisher wants the fix, not compat** — the wish says "it should just set AWS_PROFILE." no mention of compat, deprecation, or migration.

3. **no known callers depend on JSON** — AWS_PROFILE with JSON credentials breaks all AWS tools. no caller should depend on broken behavior.

4. **compat would be YAGNI** — add code to preserve a bug = wrong. the fix is a deletion, not an addition.

the blueprint deletes the bug. there is no backwards compat to prune because we correctly chose not to add any.

---

## devil's advocate: should we have added backwards compat?

let me question my own conclusion.

### what if a caller DOES depend on JSON output?

**hypothesis:** some caller extracts credentials from AWS_PROFILE and uses them directly.

**analysis:**
- if a caller does `JSON.parse(AWS_PROFILE)` to get credentials, they bypass the AWS SDK entirely
- this is a valid use case (e.g., pass credentials to a subprocess that lacks AWS SDK)
- but keyrack was never designed for this — keyrack calls unlock, caller uses the profile name

**verdict:** this hypothetical caller is misuse. they should use `keyrack get --format json` (if we add such a feature) or call `aws sso get-role-credentials` directly.

### what if the bug was shipped in a release?

**hypothesis:** the JSON behavior was shipped, so someone might depend on it.

**analysis:**
- we should check git history to see if this was ever in a release
- even if it was, the behavior is broken for the primary use case (AWS CLI)
- a semver MAJOR bump is the correct way to signal the break

**verdict:** if shipped, we should consider whether this PR warrants a MAJOR version bump. however, the behavior is clearly a bug (AWS_PROFILE should never contain JSON), so a PATCH bump with release notes is likely appropriate.

**action:** this is not a blueprint concern — version bump decisions happen at release time. the blueprint is correct to fix the bug.

### what if the fix breaks tests in other repos?

**hypothesis:** other repos have snapshot tests that capture JSON output.

**analysis:**
- if other repos test keyrack and snapshot the output, they would fail after this fix
- this is expected — they snapshot-test a buggy behavior
- they should update their snapshots to expect the profile name

**verdict:** a break of snapshot tests in other repos is acceptable when the fix corrects a bug. the other repos benefit from the fix.

---

## final verdict

**no backwards compat should be added.** the behavior is a bug. the fix is correct. backwards compat would preserve a bug.

the blueprint correctly omits backwards compat. there is no compat to prune.
