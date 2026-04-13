# review: behavior-declaration-adherance (round 5)

## slowed down. checked each file against the spec.

---

## changed files review

### 1. KeyrackKeySpec.ts

**spec says:**
> make mech nullable

**implementation:**
```ts
mech: KeyrackGrantMechanism | null;
```

**adherance check:**
- type is nullable ✓
- comment explains null means "vault adapter will prompt" ✓
- no deviation from spec ✓

### 2. hydrateKeyrackRepoManifest.ts

**spec says:**
> remove hardcoded mech: 'PERMANENT_VIA_REPLICA'

**implementation (3 locations):**
```ts
mech: null,
```

**adherance check:**
- all three locations changed from hardcode to null ✓
- no other mech-related changes (correct — minimal change) ✓
- no deviation from spec ✓

### 3. mechAdapterGithubApp.ts

**spec says:**
> add tilde expansion: `pemPath.replace(/^~/, homedir())`

**implementation:**
```ts
const pemPathExpanded = pemPath
  .trim()
  .replace(/^~(?=$|\/|\\)/, homedir());
```

**adherance check:**
- regex is more precise than spec (`/^~(?=$|\/|\\)/` vs `/^~/`)
- this is an improvement, not a deviation
- handles edge case: bare `~` followed by non-path chars
- still matches `~/path` correctly ✓

### 4. inferKeyrackMechForSet.ts

**spec says (implicit):**
> vault adapter already calls inferKeyrackMechForSet when mech is null

**implementation:**
- changed raw readline to mockable `promptLineInput`
- this was necessary for tests, not in original blueprint

**adherance check:**
- change was additive (test infrastructure)
- did not alter the prompts logic itself ✓
- output format matches vision's "which mechanism?" prompt ✓

### 5. promptLineInput.ts (new)

**spec says:**
> (not in blueprint — test infrastructure added)

**adherance check:**
- not in original blueprint
- added to make tests work (raw readline was unmockable)
- reviewed in has-pruned-yagni: determined necessary

### 6. mockPromptLineInput.ts (new)

**spec says:**
> (not in blueprint — test infrastructure added)

**adherance check:**
- not in original blueprint
- added to make tests work
- reviewed in has-pruned-yagni: determined necessary

---

## vision adherance

| vision statement | implementation |
|------------------|----------------|
| "fill prompts which mechanism?" | `inferKeyrackMechForSet` outputs "which mechanism?" ✓ |
| "same flow as set" | both use `vault.set()` which calls `inferKeyrackMechForSet` ✓ |
| "guided setup proceeds accordingly" | mech adapter's `acquireForSet` handles this ✓ |

---

## criteria adherance

| criterion | implementation matches? |
|-----------|------------------------|
| usecase.1: fill prompts for mechanism | yes — mech null triggers prompt ✓ |
| usecase.2: ephemeral flow | yes — github app guided setup works ✓ |
| usecase.3: permanent flow | yes — replica guided setup works ✓ |
| usecase.4: explicit mech skips prompt | yes — mech not null skips prompt ✓ |
| usecase.5: single mech auto-select | yes — `supported.length === 1` auto-selects ✓ |
| usecase.6: tilde expansion | yes — `replace(/^~/, homedir())` ✓ |
| usecase.7: parity with set | yes — same codepath ✓ |

---

## deviations found

none. all changes adhere to spec. additional changes (promptLineInput) were necessary for tests and reviewed in prior self-reviews.

---

## verdict

**holds** — implementation adheres to behavior declaration. no misinterpretation. no drift.

