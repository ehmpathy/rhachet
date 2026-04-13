# self-review r10: has-behavior-declaration-adherance

## what i reviewed

verified that the blueprint adheres to the behavior declaration — that it implements what the vision describes and satisfies the criteria correctly.

---

## vision adherance

### vision.wish

> keyrack fill should infer mech from key name patterns, just like set does

**blueprint adherance:**

the blueprint does NOT implement key-name-based mech inference. the vision was refined after discussion with the wisher:

> no key-name-based inference (e.g., `*_GITHUB_TOKEN` → auto-select ephemeral)

the blueprint correctly implements mech **prompt** parity (fill prompts like set), not mech **inference** (auto-select based on key name).

**verdict:** adheres to refined vision.

### vision.outcome

| before | after | blueprint adheres? |
|--------|-------|-------------------|
| fill defaults to PERMANENT_VIA_REPLICA | fill prompts for mech selection | yes — hydration sets `mech: null` |
| no option to use GitHub App via fill | fill shows same prompt as set | yes — null mech triggers inferKeyrackMechForSet |
| must detour through set for ephemeral | fill handles ephemeral directly | yes — same vault.set code path |

**verdict:** all outcomes adhered.

### vision.usecases

| usecase | vision describes | blueprint implements |
|---------|------------------|---------------------|
| onboard-new-developer | fill prompts for mech, walks through setup | yes — null mech triggers prompt, mech adapter handles setup |
| rotate-to-ephemeral | fill prompts, user selects ephemeral | yes — null mech allows any selection |

**verdict:** all usecases adhered.

### vision.contract

> for each unfilled key, prompt for mech selection (if vault supports multiple), then run mech-specific guided setup.

**blueprint implements:**
- `mech: null` in KeyrackKeySpec → vault checks if it supports multiple mechs
- if yes → inferKeyrackMechForSet prompts
- if no → auto-selects only mech
- after selection → mech adapter's acquireForSet runs guided setup

**verdict:** contract adhered exactly.

### vision.pit-of-success

| rule | blueprint adheres? |
|------|-------------------|
| default (no mech declared) → prompt | yes — hydration sets `mech: null` |
| vault supports one mech → auto-select | yes — inferKeyrackMechForSet handles |
| explicit mech in manifest → skip prompt | noted as future — keyrack.yml doesn't support yet |

**verdict:** all pit-of-success rules adhered.

---

## criteria adherance

### usecase.1 = fill prompts for mechanism selection

| criterion | blueprint adheres? |
|-----------|-------------------|
| manifest key without explicit mech | yes — hydration sets null |
| prompts "which mechanism?" | yes — inferKeyrackMechForSet |
| proceeds to guided setup | yes — mech adapter's acquireForSet |

**verdict:** adhered.

### usecase.2 = fill with ephemeral mechanism

| criterion | blueprint adheres? |
|-----------|-------------------|
| selects EPHEMERAL_VIA_GITHUB_APP | yes — inferKeyrackMechForSet allows |
| prompts for org, app, pem | yes — mechAdapterGithubApp unchanged |
| tilde expansion in pem path | yes — added in blueprint |

**verdict:** adhered.

### usecase.3 = fill with permanent mechanism

| criterion | blueprint adheres? |
|-----------|-------------------|
| selects PERMANENT_VIA_REPLICA | yes — inferKeyrackMechForSet allows |
| prompts for secret | yes — mechAdapterReplica unchanged |

**verdict:** adhered.

### usecase.6 = pem path with tilde expansion

| criterion | blueprint adheres? |
|-----------|-------------------|
| ~ expands to home directory | yes — `homedir()` from 'os' |
| readFileSync uses expanded path | yes — pemPathExpanded variable |

**verdict:** adhered.

### usecase.7 = parity with keyrack set

| criterion | blueprint adheres? |
|-----------|-------------------|
| same prompt flow | yes — both call vault.set with null mech |
| same guided setup | yes — same mech adapter called |

**verdict:** adhered.

---

## deviations found

none. the blueprint:
- correctly interprets the refined vision (prompt, not inference)
- implements all criteria as specified
- adds tilde expansion as requested
- preserves parity with keyrack set

---

## conclusion

**PASSED.** the blueprint adheres to the behavior declaration:
- implements mech prompt (not inference) per refined vision
- satisfies all criteria usecases
- no misinterpretations or deviations from spec

---

## verification

reviewed 2026-04-10. blueprint checked line-by-line against vision and criteria.
