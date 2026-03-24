# self-review: has-questioned-assumptions

## assumptions surfaced and questioned

### assumption 1: `--owner` defaults to `default` if not specified

| question | answer |
|----------|--------|
| what do we assume? | if no --owner flag, fill for owner=default only |
| evidence? | none — i inferred this |
| did wisher say this? | no — wisher's example shows explicit --owner flags |
| what if opposite? | could require at least one --owner (more explicit) |
| counterexamples? | none found |

**verdict: QUESTIONABLE** — added to questions for wisher. could default to default, or could require explicit.

---

### assumption 2: interactive prompts are acceptable

| question | answer |
|----------|--------|
| what do we assume? | fill requires user presence to enter values |
| evidence? | adhoc example prompts user for each key |
| did wisher say this? | implicitly — adhoc requires manual input |
| what if opposite? | could pipe values from stdin or password manager |
| counterexamples? | automation scenarios (CI, unattended setup) |

**verdict: HOLDS for v1** — adhoc is interactive, so fill can be too. but noted as con: "no automation path (yet)"

---

### assumption 3: prikey discovery happens automatically

| question | answer |
|----------|--------|
| what do we assume? | system discovers some prikeys (e.g., ~/.ssh/*) |
| evidence? | wish says "could be discoverable, could be one of the ones specified in --prikey" |
| did wisher say this? | yes — implies discovery mechanism exists |
| what if opposite? | require all prikeys via --prikey flag |
| counterexamples? | none found |

**verdict: HOLDS** — wisher mentions "discovered ones" explicitly

---

### assumption 4: vault fallback to os.secure is correct default

| question | answer |
|----------|--------|
| what do we assume? | when no vault prescribed, use os.secure |
| evidence? | wish says "fallback to replica os.secure" |
| did wisher say this? | yes — but "replica" term unclear |
| what if opposite? | could fail-fast if no vault prescribed |
| counterexamples? | strict mode where all keys must have explicit vaults |

**verdict: HOLDS but with question** — fallback is explicit in wish, but "replica" needs clarification

---

### assumption 5: skip already-configured keys by default

| question | answer |
|----------|--------|
| what do we assume? | don't re-prompt if key already has value |
| evidence? | adhoc checks `if already configured then skip` |
| did wisher say this? | implicitly via adhoc pattern |
| what if opposite? | always prompt, overwrite extant |
| counterexamples? | forced refresh scenarios |

**verdict: HOLDS** — matches adhoc, enables idempotency. --refresh flag handles override.

---

### assumption 6: turtle-vibes output format

| question | answer |
|----------|--------|
| what do we assume? | output uses turtle-vibes tree format |
| evidence? | none from wisher |
| did wisher say this? | no — i applied mechanic brief patterns |
| what if opposite? | plain text output |
| counterexamples? | minimal output preference |

**verdict: HOLDS** — consistent with other rhachet commands, but could be simplified

---

### assumption 7: fail-fast on empty value

| question | answer |
|----------|--------|
| what do we assume? | empty value entry causes immediate error |
| evidence? | common pit-of-success pattern |
| did wisher say this? | no — inferred |
| what if opposite? | allow empty (some keys may be optional) |
| counterexamples? | optional keys with empty default |

**issue found: some keys may be optional**

if a key in keyrack.yml is optional (can be empty), fail-fast on empty is wrong.

**fix:** updated to: "fail-fast if required key, allow empty if optional" — but this raises another question: does keyrack.yml support optional keys?

---

### assumption 8: exit 0/1 semantics

| question | answer |
|----------|--------|
| what do we assume? | exit 0 = all verified, exit 1 = any failed |
| evidence? | standard unix convention |
| did wisher say this? | no — inferred |
| what if opposite? | partial success exit codes |
| counterexamples? | none found |

**verdict: HOLDS** — standard convention

---

## issues found

### issue 1: optional keys not considered

**what:** vision assumes all keys are required. but keyrack.yml may support optional keys.

**fix:** need to research keyrack.yml schema. if optional keys exist, empty value behavior changes.

### issue 2: automation path not addressed

**what:** vision notes "no automation path (yet)" but doesn't suggest how stdin pipe might work.

**fix:** out of scope for v1, but could note in future considerations

---

## non-issues confirmed

| assumption | why it holds |
|------------|--------------|
| interactive prompts | matches adhoc pattern, noted as con |
| prikey discovery | wisher mentions "discovered ones" |
| vault fallback to os.secure | explicit in wish (modulo "replica") |
| skip already-configured | matches adhoc, enables idempotency |
| turtle-vibes output | consistent with rhachet commands |
| exit 0/1 semantics | standard unix convention |

---

## summary

8 assumptions surfaced. 6 hold clearly. 2 need clarification:
1. `--owner` default behavior — question for wisher
2. optional keys in keyrack.yml — research needed
