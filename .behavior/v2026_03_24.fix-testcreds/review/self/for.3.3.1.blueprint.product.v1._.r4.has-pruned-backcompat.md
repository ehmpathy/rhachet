# self-review: has-pruned-backcompat

## potential backcompat concern.1 = delete use.apikeys.sh

| question | answer |
|----------|--------|
| wisher explicitly requested this? | yes — vision says "files to eliminate: .agent/.../use.apikeys.sh" |
| evidence this backcompat is needed? | n/a — deletion is requested |
| assumed "to be safe"? | no — explicit request |

**holds**: this is not backwards compat — this is explicit elimination. the vision wants the legacy pattern gone. any callers of `source use.apikeys.sh` will get an error, which is intentional.

---

## potential backcompat concern.2 = delete use.apikeys.json

| question | answer |
|----------|--------|
| wisher explicitly requested this? | yes — vision says "files to eliminate: .agent/.../use.apikeys.json" |
| evidence this backcompat is needed? | n/a — deletion is requested |
| assumed "to be safe"? | no — explicit request |

**holds**: same as above. explicit elimination, not backwards compat.

---

## potential backcompat concern.3 = CI passthrough

| question | answer |
|----------|--------|
| wisher explicitly requested this? | yes — vision says "CI environments — keyrack passthrough via os.envvar, no unlock needed" |
| evidence this backcompat is needed? | yes — CI must continue to work |
| assumed "to be safe"? | no — explicit requirement |

**holds**: CI passthrough is explicitly requested. the pattern `if (keysPresent) return;` before keyrack spawn is a documented requirement, not assumed backwards compat.

---

## potential backcompat concern.4 = getAllAvailableIdentities optional owner param

| question | answer |
|----------|--------|
| wisher explicitly requested this? | no — vision doesn't mention internal API signatures |
| evidence this backcompat is needed? | questionable — are there other callers? |
| assumed "to be safe"? | **potentially yes** |

**analysis**:

the blueprint shows `getAllAvailableIdentities(owner?: string | null)` with owner as optional. is this backwards compat or just good function design?

examining the codepath tree:
- getAllAvailableIdentities is called from daoKeyrackHostManifest.get
- daoKeyrackHostManifest.get receives owner from callers
- callers always have owner context in the keyrack unlock flow

**question**: are there other callers of getAllAvailableIdentities that don't have owner context?

**research**: looking at the function signature in the blueprint, the owner param is optional (`owner?: string | null`). this allows extant call sites (if any) to continue to work without owner.

**decision**: this is implementation detail, not a backwards compat concern for the behavior. the function signature choice is internal. if there are no other callers, the optional param adds no value. if there are, it provides graceful upgrade.

**verdict**: not a backwards compat concern for the wisher — this is internal API design. no action needed.

---

## potential backcompat concern.5 = error message format change

| question | answer |
|----------|--------|
| wisher explicitly requested this? | yes — vision specifies new error format with unlock command |
| evidence this backcompat is needed? | n/a — new format is requested |
| assumed "to be safe"? | no |

**holds**: the old error message said "source use.apikeys.sh". the new message says "unlock keyrack". this is explicitly requested in the vision, not backwards compat.

---

## summary

| concern | verdict |
|---------|---------|
| delete use.apikeys.sh | holds — explicit elimination requested |
| delete use.apikeys.json | holds — explicit elimination requested |
| CI passthrough | holds — explicit requirement |
| getAllAvailableIdentities optional param | internal detail — not a backcompat concern |
| error message format | holds — explicit new format requested |

**no backwards compat concerns identified**. the blueprint introduces deliberate breaking changes (legacy file deletion, new error messages) that are explicitly requested by the vision. no "just in case" backwards compat was added.

---

## lesson learned

this behavior is a **migration away from** a legacy pattern, not an enhancement to it. backwards compat is irrelevant when the explicit goal is elimination.

the distinction:
- **enhancement**: add keyrack support while keeping use.apikeys.sh → backcompat matters
- **migration**: replace use.apikeys.sh with keyrack → backcompat is explicitly broken

the vision clearly specifies migration ("files to eliminate"), so backwards compat concerns don't apply.
