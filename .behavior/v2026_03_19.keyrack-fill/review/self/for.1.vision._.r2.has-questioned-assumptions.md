# self-review r2: has-questioned-assumptions

## deeper assumptions surfaced

r1 covered 8 assumptions. let me go deeper.

---

### assumption 9: command is `keyrack fill`

| question | answer |
|----------|--------|
| what do we assume? | invocation is `keyrack fill --env test ...` |
| evidence? | none — i inferred from wish which says "keyrack fill" |
| what if opposite? | could be `rhx keyrack fill` or `npx rhachet keyrack fill` |
| did wisher say? | wish says "keyrack fill" but current keyrack commands are `rhx keyrack get`, etc |

**issue found: command format unclear**

current keyrack commands use `rhx keyrack get|set|unlock`. fill should follow: `rhx keyrack fill`.

**fix:** update vision to use `rhx keyrack fill`

---

### assumption 10: keys are simple strings

| question | answer |
|----------|--------|
| what do we assume? | keys in keyrack.yml are flat strings like `CLOUDFLARE_API_TOKEN` |
| evidence? | all examples in keyrack.yml show flat strings |
| what if opposite? | keys could have properties (vault, env, required, etc) |
| counterexamples? | need to check keyrack.yml schema |

**verdict: NEEDS RESEARCH** — what does keyrack.yml actually support?

---

### assumption 11: prompt shows masked input

| question | answer |
|----------|--------|
| what do we assume? | user sees `enter value: ********` with masked echo |
| evidence? | standard password prompt behavior |
| did wisher say? | no — inferred |
| what if opposite? | could show value in plaintext |

**verdict: HOLDS** — security best practice, no reason to show plaintext

---

### assumption 12: one prompt per owner per key

| question | answer |
|----------|--------|
| what do we assume? | user enters value separately for each owner |
| evidence? | wish says inner loop on owners so user can "repeat the steps" |
| did wisher say? | yes — but also says "paste the same password" |
| what if opposite? | single prompt, copy to all owners |

**insight found**

wish says user can "paste the same password" — implies same value goes to multiple owners in common case. but also says "repeat the steps required to set their key with that vault" which implies separate prompts.

the design choice (separate prompts) is correct for the general case but adds friction in common case.

**verdict: HOLDS but awkward** — already documented in "what is awkward"

---

### assumption 13: extends flattens before iteration

| question | answer |
|----------|--------|
| what do we assume? | keys from extends are merged into single list per env |
| evidence? | that's how extends works elsewhere |
| did wisher say? | no — need to verify |

**verdict: NEEDS RESEARCH** — how does keyrack extends actually work?

---

### assumption 14: all envs have same keys across owners

| question | answer |
|----------|--------|
| what do we assume? | if key X is in env.test, all owners get key X for test |
| evidence? | makes sense from manifest perspective |
| what if opposite? | owner-specific key overrides |
| counterexamples? | none found |

**verdict: HOLDS** — manifest declares what's needed, owners are storage contexts

---

### assumption 15: prikey is ssh key format

| question | answer |
|----------|--------|
| what do we assume? | `--prikey ~/.ssh/ehmpath` is an ssh private key |
| evidence? | path looks like ssh key |
| did wisher say? | "prikey" term suggests private key |
| what if opposite? | could be age key, gpg key, etc |

**verdict: NEEDS RESEARCH** — what key format does keyrack use?

---

## issues found and fixed

### issue 1: command format ✓ FIXED

**what:** vision used `keyrack fill` but should use `rhx keyrack fill`

**how fixed:** ran sedreplace to update all 14 occurrences in 1.vision.md

**lesson:** check current command patterns before proposing new ones. keyrack commands use `rhx keyrack get|set|unlock`, so fill should follow.

### issue 2: keyrack.yml schema unknown

**what:** assumed flat key strings without schema verification

**status:** added to research questions in vision

**lesson:** don't assume schema — verify before design

### issue 3: prikey format unknown

**what:** assumed ssh key without verification

**status:** added to research questions in vision

**lesson:** don't assume key format — keyrack may support age, gpg, or other formats

---

## r2 conclusions

r1 covered the obvious assumptions. r2 surfaced 7 more:
- 1 issue to fix (command format)
- 3 items need research (keyrack.yml schema, extends behavior, prikey format)
- 3 hold clearly

total assumptions reviewed across r1 + r2: 15
