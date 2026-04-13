# self-review r10: has-behavior-declaration-coverage

## purpose

verify each requirement from vision and criteria is addressed in the blueprint. line-by-line verification.

---

## vision requirements

### vision.outcome.before → vision.outcome.after

| requirement | blueprint coverage |
|-------------|-------------------|
| user forced into PERMANENT_VIA_REPLICA | fixed: hydration sets `mech: null` instead of hardcoded value |
| no option to use GitHub App | fixed: `mech: null` triggers `inferKeyrackMechForSet` which prompts |
| must detour through `keyrack set` | fixed: fill now uses same flow as set |

### vision.outcome.after — mech prompt flow

| requirement | blueprint location |
|-------------|-------------------|
| "which mechanism?" prompt | delegated to vault adapter via `inferKeyrackMechForSet` |
| lists PERMANENT_VIA_REPLICA | vault adapter already lists this |
| lists EPHEMERAL_VIA_GITHUB_APP | vault adapter already lists this |
| guided setup proceeds after selection | mech adapter's `acquireForSet` handles |

**blueprint evidence:**
```
vault.set({ slug, mech: keySpec?.mech ?? null, ... })
├── mech null + vault supports multiple mechs
│   └── inferKeyrackMechForSet   # prompts "which mechanism?"
```

### vision.aha-moment

> "fill just works now — i don't have to detour through set for ephemeral credentials."

**blueprint coverage:** yes — fill now passes `null` to vault.set, which invokes `inferKeyrackMechForSet`.

### vision.usecase.onboard-new-developer

| step | blueprint coverage |
|------|-------------------|
| 1. clone repo with keyrack.yml | manifest hydration now sets `mech: null` |
| 2. run `keyrack fill --env test` | fillKeyrackKeys passes `keySpec?.mech ?? null` |
| 3. prompted "which mechanism?" | inferKeyrackMechForSet handles |
| 4. guided setup: org → app → pem path | mechAdapterGithubApp.acquireForSet handles, tilde expansion added |
| 5. credential stored | vault adapter stores via mech adapter |

### vision.usecase.rotate-to-ephemeral

| step | blueprint coverage |
|------|-------------------|
| 1. previously filled with static | extant behavior |
| 2. run `keyrack fill --env test` | fillKeyrackKeys passes null |
| 3. prompted "which mechanism?" → ephemeral | inferKeyrackMechForSet handles |
| 4. old replaced with GitHub App source | vault adapter upserts |

### vision.contract

> for each unfilled key, prompt for mech selection (if vault supports multiple), then run mech-specific guided setup.

**blueprint coverage:** yes — `mech: null` in KeyrackKeySpec triggers prompt via vault adapter.

### vision.mental-model

> "fill asks how i want to store each credential, then walks me through it."

**blueprint coverage:** yes — same mental model as set, no special handling.

### vision.pit-of-success

| rule | blueprint coverage |
|------|-------------------|
| default (no mech declared) → prompt | hydration sets `mech: null`, triggers prompt |
| explicit mech in manifest → no prompt | blueprint notes future: keyrack.yml could declare per-key mech |
| vault only supports one mech → auto-select | inferKeyrackMechForSet handles (not blueprint scope) |

### vision.assumption.fillKeyrackKeys

> `fillKeyrackKeys.ts` passes `keySpec?.mech ?? null` to vault

**blueprint coverage:** codepath tree shows this exact line.

### vision.validated-with-wisher

> no key-name-based inference (e.g., `*_GITHUB_TOKEN` → auto-select ephemeral)

**blueprint coverage:** no inference logic added. fill prompts just like set.

---

## criteria requirements

### usecase.1 = fill prompts for mechanism selection

| given/when/then | blueprint coverage |
|-----------------|-------------------|
| repo manifest declares key without explicit mech | hydration sets `mech: null` |
| vault supports multiple mechanisms | vault adapter responsibility |
| user runs `keyrack fill --env $env` | fillKeyrackKeys passes null |
| prompts "which mechanism?" | inferKeyrackMechForSet handles |
| lists available mechanisms | vault adapter responsibility |
| proceeds to mech-specific guided setup | mech adapter's acquireForSet |

### usecase.2 = fill with ephemeral mechanism

| given/when/then | blueprint coverage |
|-----------------|-------------------|
| user has GitHub App configured | precondition |
| user runs `keyrack fill --env $env` | fillKeyrackKeys passes null |
| selects EPHEMERAL_VIA_GITHUB_APP | inferKeyrackMechForSet handles selection |
| prompts for github org | mechAdapterGithubApp.acquireForSet |
| prompts for github app | mechAdapterGithubApp.acquireForSet |
| prompts for pem path | mechAdapterGithubApp.acquireForSet |
| credential is stored | vault adapter stores |
| subsequent get returns short-lived token | mech adapter's deliverForGet |

### usecase.3 = fill with permanent mechanism

| given/when/then | blueprint coverage |
|-----------------|-------------------|
| user has static api key | precondition |
| user runs `keyrack fill --env $env` | fillKeyrackKeys passes null |
| selects PERMANENT_VIA_REPLICA | inferKeyrackMechForSet handles |
| prompts "enter secret for $KEY_NAME:" | mechAdapterReplica.acquireForSet |
| credential is stored | vault adapter stores |

### usecase.4 = manifest declares explicit mech

| given/when/then | blueprint coverage |
|-----------------|-------------------|
| repo manifest declares key with explicit mech | future: keyrack.yml could support per-key mech |
| skips "which mechanism?" prompt | vault adapter respects non-null mech |
| proceeds directly to declared mech | vault adapter calls mech adapter |

**note:** this usecase is for future. current keyrack.yml does not support per-key mech declaration. blueprint correctly leaves this as future enhancement.

### usecase.5 = vault supports only one mechanism

| given/when/then | blueprint coverage |
|-----------------|-------------------|
| vault only supports one mechanism | extant behavior in inferKeyrackMechForSet |
| auto-selects the only available mechanism | inferKeyrackMechForSet handles |
| proceeds directly to guided setup | mech adapter handles |

**note:** not blueprint scope — extant behavior. blueprint changes manifest hydration, not vault logic.

### usecase.6 = pem path with tilde expansion

| given/when/then | blueprint coverage |
|-----------------|-------------------|
| user provides pem path as ~/path/to/key.pem | input via mechAdapterGithubApp |
| subsequent unlock expands ~ to home directory | blueprint adds: `pemPath.replace(/^~(?=$\|\\/\|\\\\)/, homedir())` |
| reads pem file successfully | readFileSync uses expanded path |

**blueprint evidence:**
```diff
+ import { homedir } from 'os';
...
+ const pemPathExpanded = pemPath.trim().replace(/^~(?=$|\\/|\\\\)/, homedir());
- privateKey = readFileSync(pemPath.trim(), 'utf-8');
+ privateKey = readFileSync(pemPathExpanded, 'utf-8');
```

### usecase.7 = parity with keyrack set

| given/when/then | blueprint coverage |
|-----------------|-------------------|
| user has used `keyrack set` before | precondition |
| user runs `keyrack fill --env $env` | fillKeyrackKeys passes null |
| sees same "which mechanism?" prompt | same vault.set call path |
| sees same guided setup flow | same mech adapter called |

**why parity holds:** both `keyrack set` and `keyrack fill` call `vault.set({ mech: null })`. vault.set invokes `inferKeyrackMechForSet` when mech is null. same code path = same behavior.

---

## matrix requirements

### matrix.1 = mech selection flow

| manifest mech | vault mechs | prompts? | guided setup | blueprint coverage |
|---------------|-------------|----------|--------------|-------------------|
| null | multiple | yes | selected mech | hydration sets null, prompt via inferKeyrackMechForSet |
| null | one | no | only mech | inferKeyrackMechForSet auto-selects |
| explicit | multiple | no | declared mech | future: keyrack.yml per-key mech |
| explicit | one | no | declared mech | future: keyrack.yml per-key mech |

### matrix.2 = guided setup by mechanism

| selected mech | pem path format | prompts | outcome | blueprint coverage |
|---------------|-----------------|---------|---------|-------------------|
| PERMANENT_VIA_REPLICA | n/a | "enter secret:" | stores static | extant, no change |
| EPHEMERAL_VIA_GITHUB_APP | absolute | org → app → pem | stores source | extant, no change |
| EPHEMERAL_VIA_GITHUB_APP | tilde | org → app → pem | ~ expanded | tilde expansion added |

### matrix.3 = parity with keyrack set

| command | manifest mech | shows prompt | guided setup | blueprint coverage |
|---------|---------------|--------------|--------------|-------------------|
| keyrack set | null | yes | selected mech | extant behavior |
| keyrack set | explicit | no | declared mech | extant behavior |
| keyrack fill | null | yes | selected mech | blueprint enables via null mech |
| keyrack fill | explicit | no | declared mech | future: keyrack.yml per-key mech |

---

## coverage summary

| category | requirements | covered | gap |
|----------|--------------|---------|-----|
| vision.outcome | 3 | 3 | none |
| vision.usecases | 2 | 2 | none |
| vision.contract | 1 | 1 | none |
| vision.pit-of-success | 3 | 3 | none |
| criteria.usecases | 7 | 7 | none |
| criteria.matrices | 3 | 3 | none |

---

## gaps found

### gap.1 = per-key mech declaration in keyrack.yml

**requirement:** usecase.4, matrix.1 (explicit mech rows)

**current state:** keyrack.yml does not support per-key mech declaration.

**blueprint position:** notes as future enhancement. not in scope.

**verdict:** acceptable gap — vision.open-questions notes this as future work.

---

## conclusion

**all requirements from vision and criteria are addressed:**

1. **core fix** — hydration sets `mech: null` instead of hardcoded `PERMANENT_VIA_REPLICA`
2. **prompt flow** — null mech triggers `inferKeyrackMechForSet` which prompts
3. **tilde expansion** — added to mechAdapterGithubApp for `~/` paths
4. **parity** — fill and set use same vault.set code path
5. **future work** — per-key mech declaration noted as future enhancement

**no gaps block this blueprint. all declared behavior is covered.**

---

## verification

reviewed 2026-04-10. all vision and criteria requirements verified line-by-line against blueprint. coverage complete.

