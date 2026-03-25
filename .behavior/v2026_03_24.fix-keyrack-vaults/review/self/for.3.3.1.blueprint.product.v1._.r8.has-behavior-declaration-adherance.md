# self-review: has-behavior-declaration-adherance (revision 8)

## stone
3.3.1.blueprint.product.v1

## review context
this review checks for adherance — does the blueprint match the vision and criteria? the prior review (coverage) confirmed all requirements are represented. this review confirms they are represented correctly.

---

## vision adherance check

### vision § "the outcome world" — before

the vision describes the problem:
- sensitive keys persist to disk with os.secure/os.direct
- bash history pollution with export
- manual copy from 1password each session

**blueprint adherance:** the blueprint addresses this via:
- os.daemon: `skip host manifest write`, `skip repo manifest write` → no disk persistence
- 1password: stores exid only, not secret → no key value in keyrack storage
- prompts via stdin → no bash history

✓ matches vision

### vision § "the outcome world" — after path 1

the vision shows:
```sh
$ rhx keyrack set --key STRIPE_ADMIN_API_KEY --vault os.daemon --env prod
enter secret for STRIPE_ADMIN_API_KEY: ********
🔐 keyrack set (org: ehmpathy, env: prod)
   └─ ehmpathy.prod.STRIPE_ADMIN_API_KEY
      ├─ mech: EPHEMERAL_VIA_REPLICA
      ├─ vault: os.daemon
      └─ expires in: 9h
```

**blueprint adherance:**
- codepath: `promptHiddenInput()` → secret prompt ✓
- codepath: `return mech=EPHEMERAL_VIA_REPLICA` → correct mech ✓
- codepath: `outputResult()` → displays expiration ✓

✓ matches vision

### vision § "the outcome world" — after path 2

the vision shows:
```sh
$ rhx keyrack set --key STRIPE_ADMIN_API_KEY --vault 1password --env prod
enter 1password uri (e.g., op://vault/item/field): op://prod-keys/stripe-admin/credential
🔐 keyrack set (org: ehmpathy, env: prod)
   └─ ehmpathy.prod.STRIPE_ADMIN_API_KEY
      ├─ mech: PERMANENT_VIA_REFERENCE
      ├─ vault: 1password
      ├─ exid: op://prod-keys/stripe-admin/credential
      └─ verify roundtrip...
```

**blueprint adherance:**
- codepath: `promptVisibleInput() for exid` → exid prompt ✓
- domain objects: `PERMANENT_VIA_REFERENCE` → correct mech ✓
- codepath: `validateRoundtrip()` → roundtrip verification ✓
- contracts: `vaultAdapter1Password.set` returns `{ exid }` → exid in output ✓

✓ matches vision

### vision § "the outcome world" — path 2b (op cli not installed)

the vision shows exit code 2 with ubuntu install instructions.

**blueprint adherance:**
- codepath: `isOpCliInstalled()` + `exit 2 (constraint error)` ✓
- error messages: ubuntu install steps 1-4 ✓

✓ matches vision

### vision § "unlock pulls from 1password"

the vision shows:
```sh
$ rhx keyrack unlock --env prod
🔓 keyrack unlock
   └─ ehmpathy.prod.STRIPE_ADMIN_API_KEY
      ├─ vault: 1password
      ├─ exid: op://prod-keys/stripe-admin/credential
      └─ expires in: 9h
```

**blueprint adherance:**
- codepath shows unlock flow with `vaultAdapter1Password.get()` → `execOp(['read', exid])` → `daemonAccessUnlock()` ✓
- all markers are `[○]` (retain) → extant behavior, no changes needed ✓

✓ matches vision

---

## criteria adherance check

### usecase.1 criteria vs blueprint

| criterion | expected | blueprint delivers |
|-----------|----------|-------------------|
| prompts for secret via stdin | secret never in bash history | `promptHiddenInput()` ✓ |
| stores in daemon memory only | no disk persistence | `skip host manifest write` ✓ |
| mech=EPHEMERAL_VIA_REPLICA | consistent mech convention | adapter returns correct mech ✓ |
| displays expiration | user knows when key dies | `outputResult()` ✓ |

✓ all criteria match

### usecase.2 criteria vs blueprint

| criterion | expected | blueprint delivers |
|-----------|----------|-------------------|
| prompts for 1password uri | not prompts for secret itself | `promptVisibleInput() for exid` ✓ |
| validates roundtrip | broken exids fail at set time | `validateRoundtrip()` ✓ |
| stores pointer in manifest | secret never in keyrack | `write host manifest` with exid ✓ |
| mech=PERMANENT_VIA_REFERENCE | consistent mech convention | new type in KeyrackGrantMechanism ✓ |
| unlock fetches from 1password | fresh value on each unlock | extant `execOp(['read', exid])` ✓ |

✓ all criteria match

### usecase.3 criteria vs blueprint

| criterion | expected | blueprint delivers |
|-----------|----------|-------------------|
| OP_SERVICE_ACCOUNT_TOKEN auth | ci uses service account | implicit: op cli native ✓ |
| no human interaction | automated unlock | token bypasses biometric ✓ |

✓ criteria match (implicit coverage acceptable — op cli behavior)

### usecase.4 criteria vs blueprint

| criterion | expected | blueprint delivers |
|-----------|----------|-------------------|
| displays "op cli not found" | clear error | error messages section ✓ |
| displays ubuntu install instructions | actionable guidance | steps 1-4 documented ✓ |
| exits with code 2 | constraint error semantics | codepath confirms ✓ |

✓ all criteria match

### usecase.5 criteria vs blueprint

| criterion | expected | blueprint delivers |
|-----------|----------|-------------------|
| displays authentication error | user knows why failed | roundtrip catches, error shown ✓ |
| hints op signin | actionable guidance | error messages include whoami hint ✓ |
| exits with code 2 | constraint error semantics | same as usecase.4 ✓ |

✓ all criteria match

### usecase.6 criteria vs blueprint

| criterion | expected | blueprint delivers |
|-----------|----------|-------------------|
| roundtrip validation fails | broken exid caught early | `validateRoundtrip()` ✓ |
| displays error with exid | user sees what failed | error messages section ✓ |
| exits with code 2 | constraint error semantics | same exit code ✓ |

✓ all criteria match

---

## deviation check

searched for deviations from vision/criteria:

| item | vision says | blueprint says | deviation? |
|------|------------|----------------|------------|
| os.daemon mech | EPHEMERAL_VIA_REPLICA | EPHEMERAL_VIA_REPLICA | none |
| 1password mech | PERMANENT_VIA_REFERENCE | PERMANENT_VIA_REFERENCE | none |
| exid prompt | visible (not hidden) | promptVisibleInput() | none |
| secret prompt | hidden | promptHiddenInput() | none |
| manifest skip | os.daemon only | `[+] skip` markers | none |
| roundtrip | validate at set time | validateRoundtrip() | none |

no deviations found.

---

## junior drift check

the route system warned a junior may have touched the pr. checked for common drift patterns:

| drift pattern | found? | evidence |
|---------------|--------|----------|
| wrong mech name | no | EPHEMERAL_VIA_REPLICA, PERMANENT_VIA_REFERENCE correct |
| deprecated aliases retained | no | blueprint shows removal of REPLICA, GITHUB_APP, AWS_SSO |
| manifest write for os.daemon | no | `[+] skip` markers explicit |
| secret prompt for 1password | no | `promptVisibleInput() for exid` — not secret |
| roundtrip skipped | no | `validateRoundtrip()` in codepath |

no junior drift found.

---

## verdict

the blueprint adheres to the vision and criteria. all usecases map correctly. no deviations or drift detected.
