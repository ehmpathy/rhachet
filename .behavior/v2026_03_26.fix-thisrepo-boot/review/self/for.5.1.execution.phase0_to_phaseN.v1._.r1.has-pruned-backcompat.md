# self-review r1: has-pruned-backcompat

a thorough review for backwards compatibility that was not explicitly requested.

---

## step 1: understand the context

the execution created one config file: `.agent/repo=.this/role=any/boot.yml`

the execution did not:
- modify any code
- modify any tests
- modify any extant files
- change any interfaces
- change any contracts

---

## step 2: enumerate potential backcompat concerns

### concern 1: "what if someone depends on all briefs as say?"

**analysis:**

before boot.yml: all briefs were said (default behavior)
after boot.yml: 7 briefs are said, 12 are refs

**is this a backcompat concern?**

no. the wisher explicitly requested this change:
> "we should use the boot.yml capacity and drop a boot.yml in that role"
> "so that we can control which ones are said vs reffed"
> "not all of them need to be said, refs are often times more than sufficient!"

the wish explicitly asks to change the default behavior. there is no request to maintain the old behavior.

**did we add any backcompat shims?**

no. there are no:
- fallback mechanisms
- environment variables to restore old behavior
- config flags to disable the change
- migration paths

**holds:** no unprescribed backcompat added.

### concern 2: "what if boot.yml breaks extant sessions?"

**analysis:**

boot.yml is a new file. it does not modify extant behavior for:
- other roles (they don't have boot.yml)
- other repos (they don't have this boot.yml)
- the machinery (it already supports boot.yml)

**did we add any defensive code?**

no. we did not add:
- try/catch around boot.yml parse
- fallback to say-all if parse fails
- version checks
- feature flags

**why this holds:** the machinery already handles boot.yml. the extant code in `parseRoleBootYaml.ts` already validates the schema. no defensive backcompat code was needed or added.

### concern 3: "what if briefs are renamed?"

**analysis:**

boot.yml uses exact paths like `briefs/define.rhachet.v3.md`. if a brief is renamed, it would no longer match.

**did we add any backcompat for renames?**

no. we did not add:
- alias support
- redirect mechanisms
- deprecation warnings
- migration procedures

**why this holds:** the wish did not ask for rename tolerance. exact paths are intentional — they are explicit and clear. if a brief is renamed, boot.yml should be updated to reflect the rename. this is correct behavior, not a backcompat concern.

### concern 4: "what about the ref array?"

**analysis:**

boot.yml does not have a `ref:` array. unmatched briefs become refs automatically.

**is omitting ref array a backcompat concern?**

no. the machinery has always supported:
- `say: [...]` → matched briefs said, unmatched reffed
- no `ref:` needed for this behavior

**did we add ref array "just in case"?**

no. we did not add an explicit ref array because:
1. the blueprint does not include one
2. the machinery does not require one
3. it would be yagni

**holds:** no unprescribed ref array added.

---

## step 3: check for assumed backcompat

### did we assume "to be safe"?

| potential assumption | made? | evidence |
|---------------------|-------|----------|
| keep old behavior as option | no | no env vars or flags |
| allow bypass of boot.yml | no | no bypass mechanism |
| support deprecated globs | no | no alias support |
| version the config | no | no version field |
| add migration path | no | no migration procedure |

**holds:** no "to be safe" assumptions made.

### did we add defensive patterns?

| potential pattern | added? | evidence |
|-------------------|--------|----------|
| try/catch fallback | no | no error logic added |
| feature flag | no | no conditional logic |
| gradual rollout | no | no percentage-based enable |
| canary mechanism | no | no comparison mode |

**holds:** no defensive patterns added.

---

## step 4: verify against memory

per the user's memory (`feedback_zero_backcompat.md`):

> "never add backwards compat, just delete"

**did we violate this guidance?**

no. we did not add any backwards compatibility. we:
- created one new file
- did not add fallbacks
- did not add shims
- did not add migration paths
- did not add deprecation warnings

**holds:** memory guidance followed.

---

## step 5: flag open questions

are there any backcompat concerns that should be flagged for the wisher?

| concern | flag? | reason |
|---------|-------|--------|
| all-briefs-say behavior change | no | explicitly requested in wish |
| exact paths may break on rename | no | correct behavior, not a concern |
| no ref array | no | by design, not an oversight |

**result:** no open questions for the wisher. all behaviors are as requested.

---

## summary

| backcompat check | result | evidence |
|------------------|--------|----------|
| behavior change | as requested | wish explicitly asks for it |
| defensive code | none added | no try/catch, no flags |
| fallback mechanisms | none added | no env vars, no bypass |
| migration paths | none added | no procedures, no warnings |
| assumed "to be safe" | none | no defensive patterns |
| memory guidance | followed | zero backcompat added |
| open questions | none | all behaviors as requested |

**verdict:** zero unprescribed backwards compatibility found. the execution follows the user's explicit guidance: "never add backwards compat, just delete." the change is clean and direct.
