# self-review r11: has-behavior-declaration-adherance (second pass)

## what i reviewed

second pass review of blueprint adherance to behavior declaration. fresh eyes, line by line.

---

## blueprint → vision alignment

### core fix: mech: null instead of hardcoded

**vision says:**
- fill should prompt for mech selection like set does
- user should be able to choose ephemeral or permanent

**blueprint does:**
- hydration sets `mech: null` instead of `PERMANENT_VIA_REPLICA`
- null mech triggers `inferKeyrackMechForSet` in vault adapter
- vault adapter prompts "which mechanism?"

**verdict:** aligned. the change is minimal and correct.

### tilde expansion fix

**vision says (implicit):**
- GitHub App mech requires pem path
- paths like `~/keys/app.pem` should work

**blueprint does:**
- adds `homedir()` import from 'os'
- expands `~` to home directory before readFileSync

**verdict:** aligned. fixes real user friction.

---

## blueprint → criteria alignment

### usecase.1: fill prompts for mechanism

| step in criteria | blueprint codepath |
|------------------|-------------------|
| user runs `keyrack fill --env $env` | fillKeyrackKeys orchestrator |
| for each unfilled key | loop passes `mech: null` |
| vault.set receives null mech | inferKeyrackMechForSet called |
| prompts "which mechanism?" | extant prompt logic |

**verdict:** aligned step-by-step.

### usecase.6: tilde expansion

| step in criteria | blueprint codepath |
|------------------|-------------------|
| user provides `~/path/to/key.pem` | acquireForSet receives path |
| tilde expanded to home dir | `pemPath.replace(/^~(?=$|\/|\\)/, homedir())` |
| readFileSync succeeds | uses pemPathExpanded |

**verdict:** aligned step-by-step.

### usecase.7: parity with set

| aspect | keyrack set | keyrack fill (after fix) |
|--------|-------------|-------------------------|
| mech null | vault prompts | vault prompts |
| mech explicit | skip prompt | skip prompt |
| guided setup | mech adapter | mech adapter |

**verdict:** parity achieved via same code path.

---

## deviations or misinterpretations

**none found.**

the blueprint:
1. does not implement key-name-based inference (per refined vision)
2. does implement mech prompt parity (per core wish)
3. does fix tilde expansion (per real user need)
4. does not over-engineer (no new abstraction, no new procedures)

---

## conclusion

**PASSED.** blueprint adheres to behavior declaration. no deviations.

---

## verification

reviewed 2026-04-10. second pass, fresh perspective. all criteria verified.
