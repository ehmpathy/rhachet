# review: has-pruned-yagni

> **note: this is the review that documents the YAGNI decision for `--mode plan`.** in execution, `--mode plan` was identified as unnecessary and excluded. the decision is documented here at line 73. tests verify behavior via `program.parseAsync` and config file inspection instead of plan mode output.

## the question

YAGNI asks: did we add code that was not explicitly requested?

## deep review

### domain objects

**BrainSlug and RoleSlug** — type aliases to string.
- requested: yes, blueprint 3.3.1 declares them
- why minimal: just `type X = string`. no class, no validation, no methods. the simplest possible representation.
- why it holds: the blueprint called for them. they provide semantic clarity without runtime cost.

**BrainCliEnrollmentSpec** — holds mode ('replace' | 'delta') and ops array.
- requested: yes, blueprint 3.3.1 declares it under domain objects
- why minimal: only two fields. mode is a discriminated union of exactly two values. ops is the minimal array needed.
- why it holds: directly maps to the spec syntax from criteria 2.1 (mechanic vs +architect vs -driver).

**BrainCliEnrollmentOperation** — holds action ('add' | 'remove') and role string.
- requested: yes, blueprint 3.3.1 declares it
- why minimal: exactly two fields. action has exactly two valid values. role is a string.
- why it holds: this is the smallest unit that can represent a spec operation.

**BrainCliEnrollmentManifest** — holds brain slug and final roles array.
- requested: yes, blueprint 3.3.1 declares it
- why minimal: two fields. brain is which CLI to spawn. roles is the computed list.
- why it holds: this is the output of computation, input to config generation. no extras.

**BrainCliConfigArtifact** — type alias to string (path).
- requested: yes, blueprint 3.3.1 lists it
- question: could this be inlined? yes, genBrainCliConfigArtifact could return `{ configPath: string }`.
- decision: kept as declared in blueprint for traceability. not a violation — it's prescribed.

### domain operations

**parseBrainCliEnrollmentSpec** — parses --roles string to spec object.
- requested: yes, blueprint 3.3.1 codepath tree shows it
- why minimal: does exactly one thing — parse string to structured data. no cache, no side effects.
- why it holds: the criteria (2.1) define the syntax. the parser implements that syntax and no more.

**computeBrainCliEnrollment** — computes final roles from spec + defaults + linked.
- requested: yes, blueprint 3.3.1 codepath tree shows it
- why minimal: implements the replace/delta logic per criteria. typo detection uses fastest-levenshtein (extant dep).
- why it holds: the criteria define idempotent ops, typo suggestions, and mode semantics. all implemented, no extras.

**genBrainCliConfigArtifact** — generates settings.local.json with filtered hooks.
- requested: yes, blueprint 3.3.1 codepath tree shows it
- why minimal: reads settings.json, filters hooks by author pattern, writes settings.local.json. three steps.
- why it holds: criteria 2.1 require hooks to be filtered by enrolled roles. this does exactly that.

**enrollBrainCli** — spawns the brain CLI.
- requested: yes, blueprint 3.3.1 codepath tree shows it
- why minimal: spawn with inherited stdio, pass args, forward exit code. no process management, no log output.
- why it holds: criteria 2.1 usecase.14 requires passthrough of other args. this implements that.

### CLI command

**invokeEnroll** — commander command that composes the above.
- requested: yes, blueprint 3.3.1 contract layer shows it
- why minimal: defines command, parses --roles, composes operations, spawns brain. no extra options, no flags beyond --roles.
- why it holds: all usecases (1-14) are covered. no usecase is unimplemented. no extra features added.

## extras check

| potential extra | found? | action |
|-----------------|--------|--------|
| cache layer | no | - |
| verbose/debug mode | no | - |
| config file support | no | - |
| env var support (RHACHET_ROLES) | no | not in criteria |
| --mode plan flag | no | - |
| telemetry/metrics | no | - |
| role validation UI | no | - |

none of these were added. the vision mentioned RHACHET_ROLES env var but the criteria settled on `--roles` flag only.

## conclusion

every component was explicitly requested in the blueprint. no premature abstractions. no "future flexibility" code. no "while we're here" features. implementation is minimal and matches criteria exactly.
