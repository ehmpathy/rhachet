# self-review r5: has-pruned-yagni

## purpose

review for extras that were not prescribed. YAGNI = "you ain't gonna need it".

---

## component checklist

### component 1: KeyrackKeySpec.mech nullable

**was this explicitly requested?**
- vision: "fill asks how i want to store each credential"
- required: vault adapter prompts when mech is null; manifest must express "no mech constraint"

**is this the minimum viable way?**
yes — one type change: `| null`. no new types, no new fields.

**abstraction for future flexibility?**
no — null is the simplest representation of "not declared".

**verdict:** not YAGNI. required for mech prompt flow.

---

### component 2: hydrateKeyrackRepoManifest removes hardcode

**was this explicitly requested?**
- vision: "fill passed hardcoded mech, so vault never prompted"
- this IS the root cause fix

**is this the minimum viable way?**
yes — change `'PERMANENT_VIA_REPLICA'` to `null` at 3 locations. no logic added.

**abstraction for future flexibility?**
no — pure removal of hardcoded value.

**verdict:** not YAGNI. this is the fix.

---

### component 3: mechAdapterGithubApp tilde expansion

**was this explicitly requested?**
- not in core vision
- in handoff: "user paths with `~/` failed with ENOENT"
- codified in criteria matrix

**is this the minimum viable way?**
yes — one import + one line: `pemPath.replace(/^~(?=$|\/|\\)/, homedir())`

**hard question: should this be a separate behavior route?**

the tilde expansion is a bug in mechAdapterGithubApp that affects anyone who uses GitHub App with tilde paths — not just fill. strictly stated, this is a secondary fix discovered in research phase.

| option | cost | benefit |
|--------|------|---------|
| separate route | ~1 hour overhead (wish, vision, criteria, blueprint, execution) | cleaner scope isolation |
| bundle with this route | ~5 min additional work | complete GitHub App flow now |

**why we bundle:**
1. discovered during research for this behavior — we'd need to remember to file it separately
2. the fix is 1 line + 1 import — the route overhead exceeds the fix
3. without it, GitHub App flow fails for `~/` paths — incomplete delivery
4. already documented in criteria matrix — explicitly acknowledged
5. affects set AND fill equally — not fill-specific, but discovered here

**why this is not YAGNI:**
YAGNI applies to speculative features. this is a concrete bug fix for an observed failure (`ENOENT` on `~/.ssh/my.pem`). the handoff explicitly mentioned it. to NOT fix it would leave a broken flow.

**the real YAGNI question:**
did we add error logic for `homedir()` edge cases? no. that would be YAGNI.
did we create an `expandTilde()` utility? no. that would be YAGNI.
did we add comprehensive path validation? no. that would be YAGNI.

we added the minimum: one line to expand `~` to `homedir()`.

**verdict:** not YAGNI. secondary fix bundled for practical reasons. the fix is minimal and addresses a real failure mode from the handoff.

---

### component 4: no new tests

**was this explicitly requested?**
- not mentioned in vision
- blueprint notes: "no new tests required — changes are minimal"

**is this YAGNI-compliant?**
yes — to add tests "for completeness" would be YAGNI. extant tests pass. the changes are:
- one type change (compiler-verified)
- value changes (extant tests don't assert mech)
- one-line tilde expansion (stdin mock complexity exceeds value)

**verdict:** not YAGNI. minimal changes need minimal test additions.

---

### component 5: no new files

**was this explicitly requested?**
- not mentioned in vision
- blueprint creates no new files

**is this YAGNI-compliant?**
yes — all changes are in extant files. no utilities, no new abstractions.

**verdict:** not YAGNI. modification over creation.

---

## did we add features "while we're here"?

| potential addition | present? | verdict |
|-------------------|----------|---------|
| key-name-based mech inference | no | vision explicitly rejected |
| manifest mech declaration | no | vision marked as "future" |
| error logic for homedir() | no | scope creep for edge case |
| unit tests for tilde expansion | no | would require stdin mock |
| observability | no | not requested |
| documentation updates | no | not in scope |

no features added beyond what was prescribed.

---

## did we optimize before needed?

| potential optimization | present? | verdict |
|-----------------------|----------|---------|
| mech cache | no | not requested |
| lazy evaluation | no | not needed |
| complex regex optimization | no | simple regex is correct |

no premature optimizations.

---

## did we add abstraction for future flexibility?

| potential abstraction | present? | verdict |
|----------------------|----------|---------|
| MechConstraint type | no | null suffices |
| ExpandPath utility | no | inline is fine |
| configurable mech defaults | no | not requested |

no speculative abstractions.

---

## conclusion

**no YAGNI violations found.**

all components trace to vision, criteria, or handoff:
- mech nullable → required for prompt flow
- hydration removes hardcode → root cause fix
- tilde expansion → from handoff, minimal fix
- no new tests → appropriate for minimal changes
- no new files → modification over creation

the blueprint is lean: ~15 lines changed, no new abstractions, no speculative features.
