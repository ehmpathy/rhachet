# self-review: has-pruned-backcompat

## backwards-compat concern.1 = delete use.apikeys.sh

| question | answer |
|----------|--------|
| did wisher explicitly say to break this? | yes — wish: "the goal = eliminate .agent/.../use.apikeys.sh" |
| evidence this break is needed? | yes — replaced with keyrack pattern |
| did we assume "to be safe"? | no — explicit request |

**holds**: this is an explicit break requested by the wisher.

## backwards-compat concern.2 = delete use.apikeys.json

| question | answer |
|----------|--------|
| did wisher explicitly say to break this? | yes — wish mentions eliminate the adhoc pattern |
| evidence this break is needed? | yes — keyrack.yml replaces this config |
| did we assume "to be safe"? | no |

**holds**: explicit break.

## backwards-compat concern.3 = error message change

| question | answer |
|----------|--------|
| did wisher explicitly say to break this? | yes — vision shows new error format with keyrack unlock |
| evidence this break is needed? | yes — old message referenced deleted file |
| did we assume "to be safe"? | no |

**holds**: old error message said "source use.apikeys.sh", new says "rhx keyrack unlock". this is the requested change.

## backwards-compat concern.4 = remove test:auth command

| question | answer |
|----------|--------|
| did wisher explicitly say to break this? | yes — wish: "eliminate all reference to it from package.json" |
| evidence this break is needed? | yes — command sourced deleted file |
| did we assume "to be safe"? | no |

**holds**: explicit request to eliminate references.

## summary

| concern | verdict |
|---------|---------|
| delete use.apikeys.sh | holds — explicit break |
| delete use.apikeys.json | holds — explicit break |
| error message change | holds — explicit break |
| remove test:auth | holds — explicit break |

**all breaks are explicitly requested** — this behavior is a migration, not an enhancement. the wisher wants the legacy pattern gone.

## reflection

i reviewed the wish and vision documents to verify each break was explicitly requested. the wish states clearly: "the goal = eliminate .agent/.../use.apikeys.sh". the vision shows the before/after contrast and explicitly lists files to eliminate.

no backwards compatibility was added that wasn't explicitly requested. in fact, this behavior is intentionally a break — the wisher explicitly wants to eliminate the legacy pattern.

the only potential concern: callers who still run `source use.apikeys.sh` will get an error. but this is intentional — the vision acknowledges this and provides the new unlock flow as replacement.

**no issues found** — all breaks are explicit, deliberate, and documented.
