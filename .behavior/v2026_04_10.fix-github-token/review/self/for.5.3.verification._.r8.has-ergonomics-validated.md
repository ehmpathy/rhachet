# self-review: has-ergonomics-validated (round 8)

## pause

the guide asks to compare actual input/output to repros sketches. no repros artifact exists for this behavior route.

## why no repros

this is a bug fix, not a journey feature. repros documents sketch user journeys. this route has one behavioral change:

- before: fill hardcodes mech to PERMANENT_VIA_REPLICA
- after: fill prompts for mech (like set does)

the "planned ergonomics" are simply: **parity with `keyrack set`**.

## ergonomics validation

### input ergonomics

| aspect | keyrack set | keyrack fill (after fix) |
|--------|-------------|-------------------------|
| key selection | `--key X` | iterates from manifest |
| env selection | `--env X` | `--env X` |
| mech selection | prompt if vault supports multiple | prompt if vault supports multiple |

**parity achieved.** fill now prompts like set.

### output ergonomics

from snapshot, the tree structure:

```
🔐 keyrack fill (env: test, keys: 2, owners: 1)

🔑 key 1/2, API_KEY, for 1 owner
   └─ for owner case2j1
      ├─ set the key
      │  ├─
      │  │
      │  │
      │  └─
      └─ get after set, to verify
         ├─ ✓ rhx keyrack unlock --key API_KEY --env test --owner case2j1
         └─ ✓ rhx keyrack get --key API_KEY --env test --owner case2j1
```

the empty lines inside "set the key" sub.bucket are where the mech prompt appears:
- "which mechanism?"
- "1. PERMANENT_VIA_REPLICA — ..."
- "2. EPHEMERAL_VIA_GITHUB_APP — ..."

this matches the extant ergonomics of `keyrack set`.

### no drift

the design did not change between criteria and implementation:
- criteria (2.1.criteria.blackbox.yield.md): fill should prompt for mech when vault supports multiple
- implementation: fill passes `mech: null` to `vault.set()`, which triggers `inferKeyrackMechForSet()`

the ergonomics match because the same infrastructure is reused.

## why it holds

1. **input parity** — fill now prompts for mech like set does
2. **output parity** — tree structure shows prompt interaction in sub.bucket
3. **no drift** — implementation matches criteria specification
4. **no repros** — bug fix has no sketched journeys, just parity goal

## verdict

ergonomics validated. fill achieves prompt parity with set.

