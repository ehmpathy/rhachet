# self-review: has-critical-paths-identified

## critical paths identified

four critical paths documented:

| critical path | why critical |
|---------------|--------------|
| github app set → unlock → get | primary value prop |
| aws sso set → unlock → get | must not regress |
| incompatible combo → clear error | prevents frustration |
| vault inference → mech inference → set | UX friction reduction |

---

## pit of success verification

### path 1: github app set → unlock → get

| criterion | holds? | why |
|-----------|--------|-----|
| narrower inputs | ✓ | list of orgs/apps rather than manual json construction |
| convenient | ✓ | gh cli discovers orgs and apps automatically |
| expressive | ✓ | allows pem path input, fallback to manual json when gh unavailable |
| failsafes | ✓ | verify via roundtrip (unlock → get → relock) before success message |
| failfasts | ✓ | invalid pem path fails fast with clear path shown |
| idempotency | ✓ | set uses upsert pattern |

### path 2: aws sso set → unlock → get

| criterion | holds? | why |
|-----------|--------|-----|
| narrower inputs | ✓ | same prompts as extant implementation |
| convenient | ✓ | same guided flow, just moved from vault to mech adapter |
| expressive | ✓ | allows mech inference or explicit --mech flag |
| failsafes | ✓ | extant roundtrip verification preserved |
| failfasts | ✓ | extant validation preserved |
| idempotency | ✓ | same upsert pattern as before |

### path 3: incompatible combo → clear error

| criterion | holds? | why |
|-----------|--------|-----|
| narrower inputs | N/A | error case, no inputs needed |
| convenient | N/A | error case |
| expressive | N/A | error case |
| failsafes | ✓ | error message includes alternative vaults to try |
| failfasts | ✓ | fails before any storage operation occurs |
| idempotency | ✓ | no state change on error |

### path 4: vault inference → mech inference → set

| criterion | holds? | why |
|-----------|--------|-----|
| narrower inputs | ✓ | infer vault from key name (AWS_PROFILE → aws.config) |
| convenient | ✓ | infer mech when single option, prompt when ambiguous |
| expressive | ✓ | allows explicit --vault and --mech to override inference |
| failsafes | ✓ | same roundtrip verification as path 1 |
| failfasts | ✓ | fails fast on ambiguous vault inference with available options |
| idempotency | ✓ | same upsert pattern |

---

## what would happen if each critical path failed?

| path | failure scenario | user impact |
|------|------------------|-------------|
| github app set | json blob malformed, pem newlines wrong | unlock fails with cryptic error, user stuck |
| aws sso set | profile written incorrectly | extant workflows break, trust damaged |
| incompatible error | silent failure or unclear error | user wastes time on trial and error |
| inference chain | wrong vault or mech inferred | credentials stored in wrong place, hard to debug |

all four paths have clear failure modes that would cause user frustration. the pit of success measures documented address each.

---

## non-issues confirmed

1. **happy paths marked critical** — ✓ github app set and aws sso set are the two primary happy paths, both marked critical
2. **why frictionless documented** — ✓ each critical path has "why critical" explanation
3. **failure consequences considered** — ✓ table above documents impact of each failure

---

## verdict

critical paths are properly identified with:
- clear "why critical" justification
- pit of success verification for each criterion
- failure scenario analysis

no issues found.
