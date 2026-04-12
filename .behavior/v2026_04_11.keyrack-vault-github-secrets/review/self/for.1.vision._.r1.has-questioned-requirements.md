# self-review: has-questioned-requirements

## requirements from wish

### "we need a github.secrets vault"

**who said it?** wisher
**evidence?** wish explicitly says "add a new vault called `github.secrets`"
**what if we didn't?** no way to set EPHEMERAL_VIA_GITHUB_APP keys to github without manual json format work
**verdict:** ✓ holds — this is the core ask

### "get should failfast"

**who said it?** wisher
**evidence?** wish says "gets should failfast" and "we know that they wont be retrievable via api"
**what if we didn't?** unclear UX — user would expect get to work
**verdict:** ✓ holds — github api limitation, not design choice

### "status = locked when set"

**who said it?** wisher
**evidence?** wish says "status = locked if it is set"
**what if we didn't?** no way to know if key was set
**verdict:** ✓ holds — matches wisher's explicit requirement

### "reuse mech adapters"

**who said it?** inferred from wish
**evidence?** wish says "use the interactive keyrack mechanism prompts to set EPHEMERAL_VIA_GITHUB_TOKEN keys"
**what if we didn't?** duplicate guided setup logic for github.secrets
**verdict:** ✓ holds — mech reuse is the whole point

## requirements i added (potential scope creep)

### "env != 'all' → github environment secrets"

**who said it?** me, in vision
**evidence?** none from wish
**what if we didn't?** simpler implementation; users could still use env=all for all keys
**is it needed?** no — wish didn't ask for environment secrets
**verdict:** ⚠️ scope creep — remove from v1, document as future enhancement

### "--repo flag for multi-repo support"

**who said it?** me, in vision
**evidence?** none from wish
**what if we didn't?** vault writes to current repo only
**is it needed?** no — wish didn't mention multi-repo
**verdict:** ⚠️ scope creep — remove from v1, default to current repo

### "del should work via gh api"

**who said it?** me, in vision
**evidence?** none from wish
**what if we didn't?** users delete via github ui
**is it needed?** no — wish only asked for set
**verdict:** ⚠️ scope creep — remove from v1, document as future enhancement

### "exid format: owner/repo.SECRET_NAME"

**who said it?** me, in vision
**evidence?** inferred — need some way to track what was set
**what if we didn't?** no audit trail of what was set where
**is it needed?** yes — but format is implementation detail
**verdict:** ✓ holds as concept, format is TBD

## summary of changes

| requirement | action |
|-------------|--------|
| github.secrets vault | keep |
| get failfast | keep |
| status = locked | keep |
| reuse mech adapters | keep |
| environment secrets | remove from v1 |
| --repo flag | remove from v1 |
| del support | remove from v1 |
| exid format | keep concept, defer format |

## updated scope for v1

**in scope:**
- `keyrack set --key X --vault github.secrets` writes to current repo's github secrets
- mech guided setup flows through unchanged
- status shows `locked` for keys set via github.secrets
- get failfast with clear error message

**out of scope (future):**
- environment secrets
- multi-repo support
- delete via gh api

---

## articulation of findings

### issue found: scope creep on environment secrets

**what was wrong:** i added "env != 'all' → github environment secrets" to the vision without wisher asking for it. this would add complexity (different api endpoint, different permissions model) without clear need.

**how i fixed it:** removed the env-to-environment mapping from vision. v1 writes to repo-level secrets only. added to "future enhancements" section so it's not lost.

**lesson:** before adding features, check: did the wisher ask for this? if not, defer to future.

### issue found: scope creep on --repo flag

**what was wrong:** i added "--repo owner/repo" flag to support multi-repo secret management. wisher didn't mention this. the current repo is the obvious default.

**how i fixed it:** removed --repo flag from contract inputs. v1 writes to current repo only. added to "future enhancements" section.

**lesson:** start with the simplest default (current repo). add flags only when asked.

### issue found: scope creep on del support

**what was wrong:** i added "should del work?" as a question. wisher only asked for set. del is a different operation with different safety implications.

**how i fixed it:** moved del to "future enhancements" section. v1 is set-only.

**lesson:** don't assume crud operations come as a set. set != (set + del).

### non-issue: github.secrets vault

**why it holds:** wisher explicitly asked for "a new vault called `github.secrets`". this is the core ask. without it, there's no feature.

### non-issue: get failfast

**why it holds:** wisher explicitly said "gets should failfast" and explained why (github api doesn't support retrieval). this is a github platform constraint, not a design choice we can change.

### non-issue: status = locked

**why it holds:** wisher explicitly said "status = locked if it is set". this matches their mental model of "we know it was set, but can't retrieve it".

### non-issue: reuse mech adapters

**why it holds:** wisher said "use the interactive keyrack mechanism prompts to set EPHEMERAL_VIA_GITHUB_TOKEN keys". the whole point is that mechs work unchanged — only the destination changes. duplicating mech logic would defeat the purpose.

---

## deeper questions discovered

### question: EPHEMERAL_VIA_GITHUB_TOKEN vs EPHEMERAL_VIA_GITHUB_APP

**observation:** the wish says "EPHEMERAL_VIA_GITHUB_TOKEN" but the codebase has "EPHEMERAL_VIA_GITHUB_APP".

**checked:** grep for EPHEMERAL_VIA_GITHUB in KeyrackGrantMechanism.ts shows:
- EPHEMERAL_VIA_GITHUB_APP (json blob → installation token)
- EPHEMERAL_VIA_GITHUB_OIDC (oidc → temp credentials)

no "EPHEMERAL_VIA_GITHUB_TOKEN" mech.

**inference:** wisher likely meant EPHEMERAL_VIA_GITHUB_APP. the context ("format the secret in the shape required", "interactive prompts") matches github app's json blob + guided setup.

**risk:** if they meant something else (like personal access tokens), we'd build the wrong thing.

**action:** flag as question for wisher — confirm they mean EPHEMERAL_VIA_GITHUB_APP.

### question: which mechs should github.secrets support?

**consideration:** not all mechs make sense for github.secrets:
- PERMANENT_VIA_REPLICA — yes, for plain text secrets
- EPHEMERAL_VIA_GITHUB_APP — yes, the primary use case
- PERMANENT_VIA_REFERENCE — no, reference to what external vault?
- EPHEMERAL_VIA_SESSION — no, github secrets are persistent, not session-bound
- EPHEMERAL_VIA_AWS_SSO — no, wrong platform
- EPHEMERAL_VIA_GITHUB_OIDC — no, oidc tokens are generated at runtime by github actions, not stored

**proposed supported mechs:**
- PERMANENT_VIA_REPLICA
- EPHEMERAL_VIA_GITHUB_APP

**action:** add to vision as explicit design choice.

### question: "locked" vs "remote" status semantics

**observation:** wisher said "(e.g., status = locked if it is set)" — the "(e.g.," suggests this is an example, not a hard requirement.

**the core need:** "support the knowledge that it exists" and "get is impossible"

**semantic tension:**
- for os.secure, "locked" means "needs unlock to retrieve"
- for github.secrets, "locked" means "can never retrieve"

these are different states. using "locked" for both conflates them.

**alternative:** introduce `status: remote` to mean "was set to external vault, retrieval impossible"

**tradeoff:** new status adds complexity, but improves semantic precision.

**action:** already flagged in vision's open questions. wisher decides.

### question: could there be a simpler solution?

**explored:**
1. add `--export` flag to `keyrack get` for trusted destinations — no, defeats security model
2. add `--copy-to` flag to `keyrack set` for multi-vault write — no, more complex than dedicated vault
3. temporarily allow exfiltration for trusted mechs — no, violates anti-exfiltration principle

**conclusion:** github.secrets vault is the right solution. it's additive, preserves security model, and solves the exact problem.

### question: why gh cli vs direct api calls?

**observation:** wish says "mock the gh api correctly" — implies gh cli or direct api.

**gh cli advantages:**
- handles auth (uses `gh auth login` credentials)
- simpler syntax (`gh secret set`)
- consistent with other keyrack tools (e.g., EPHEMERAL_VIA_GITHUB_APP uses `gh api`)

**direct api disadvantages:**
- requires managing auth tokens separately
- more code for same outcome

**conclusion:** gh cli is the right choice. consistent with extant patterns.

### question: how does fill know to use github.secrets?

**observation:** vision says "fill repo keys for cicd" with outcome "prompts for absent keys, sets to github.secrets".

**problem:** how does `fill` know which vault to use? currently `fill` doesn't specify vault — it goes through the normal set flow. if repo manifest just lists key names, there's no vault preference.

**options:**
1. repo manifest could specify vault per key (new schema)
2. `fill` could prompt for vault during guided setup
3. `fill --vault github.secrets` flag to force vault for all keys

**action:** flag as design gap. vision doesn't address this. needs clarification.

### question: exid format for github secrets

**observation:** i proposed "owner/repo.SECRET_NAME" but the example shows "ehmpathy/rhachet.GITHUB_APP_CREDS".

**issue:** the key name is "GITHUB_APP_CREDS", not the full keyrack slug "ehmpathy.all.GITHUB_APP_CREDS". which format is correct?

**consideration:** github secrets have their own naming rules. the exid should be the github-native identifier, not the keyrack slug.

**proposed:** `{owner}/{repo}.{SECRET_NAME}` where SECRET_NAME is derived from the key name (possibly with org/env stripped).

**action:** clarify in vision that exid is github-native format, not keyrack slug.

### question: how do github.secrets keys appear in list output?

**observation:** vision shows set and get output, but not list output.

**consideration:** `keyrack list` shows all keys in host manifest. for github.secrets keys, what would the output show?

**proposed:** same as other keys, but with `vault: github.secrets`. the vault field distinguishes it.

**action:** add list output example to vision for completeness.

---

## verification: scope creep items fixed in vision

confirmed these are properly addressed in `1.vision.yield.md`:

| scope creep item | where fixed |
|------------------|-------------|
| environment secrets | line 67: "v1 writes to repo-level secrets only" + line 189 in future enhancements |
| --repo flag | removed from inputs section + line 190 in future enhancements |
| del support | not mentioned in contract + line 191 in future enhancements |

**verified:** all three scope creep items are properly scoped out of v1 and documented as future enhancements.

---

## review complete

all requirements from the wish have been questioned:
- 4 requirements validated as correct (vault, failfast, status, mech reuse)
- 3 scope creep items identified and fixed
- 8 deeper questions discovered and flagged for wisher

the vision is ready for review.
