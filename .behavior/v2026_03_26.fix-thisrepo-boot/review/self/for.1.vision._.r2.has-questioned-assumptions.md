# self-review r2: has-questioned-assumptions

re-read the vision with fresh eyes. found issues:

---

## issue 1: proposed boot.yml contradicts r1

**r1 found:** "say globs auto-ref unmatched" — we don't need ref globs.

**vision still shows:**
```yaml
briefs:
  say:
    - define.rhachet.v3.md
    # ... 6 more say patterns
  ref:
    - domain.thought/**/*.md
    # ... 5 more ref patterns
```

**contradiction:** the proposed boot.yml has both say AND ref globs. but per computeBootPlan.ts, we only need say globs — unmatched files become refs automatically.

**fix:** update proposed boot.yml to use only say globs:
```yaml
briefs:
  say:
    - define.rhachet.v3.md
    - define.agent-dir.md
```

all other briefs become refs automatically.

---

## issue 2: token estimates are inconsistent

the vision has three different estimates:
- line 17: "~79k chars (~20k tokens)" — total before
- line 47: "tokens dropped from ~20k to ~3k" — implies 3k after
- line 229: "~12k tokens → ~8k tokens" — implies 8k after

**math check:**
- if we say only 2 briefs (~10k chars), that's ~2.5k tokens
- if we say 7 briefs, that's more
- "3k" and "8k" are both plausible but inconsistent

**fix:** pick one consistent estimate. with minimal say (2 briefs), ~3k tokens is reasonable.

---

## issue 3: still too many say patterns

**r1 found:** "my proposed boot.yml is overcomplicated" — 7 say + 6 ref patterns

**vision still proposes 7 say patterns:**
1. define.rhachet.v3.md
2. define.agent-dir.md
3. howto.test-local-rhachet.md
4. bin.dispatcher.pattern.md
5. run.executable.lookup.pattern.md
6. code.test.accept.blackbox.md
7. rule.require.shared-test-fixtures.md

**question:** do we really need 7 say briefs? or is 2 sufficient?

**simpler proposal:**
```yaml
briefs:
  say:
    - define.rhachet.v3.md
    - define.agent-dir.md
```

just the core identity briefs. all else as refs. wisher can expand if needed.

---

## issue 4: vision not updated after r1

r1 identified several actions:
- "simplify proposed boot.yml to minimal say list"
- "note in vision that wisher should review final say list"

**but vision was not updated.** the r1 findings should be reflected in the vision.

**fix:** update the vision to incorporate r1 findings before we continue.

---

## summary

| issue | fix |
|-------|-----|
| ref globs not needed | remove ref section from proposed boot.yml |
| inconsistent token estimates | use consistent estimate (~3k tokens with minimal say) |
| too many say patterns | reduce to 2 core identity briefs |
| vision not updated after r1 | update vision to reflect r1 findings |

**action:** update 1.vision.md with these fixes before review complete.

---

## fixes applied

### fix 1: removed ref globs from proposed boot.yml

**before:**
```yaml
briefs:
  say:
    - define.rhachet.v3.md
    # ... 6 more
  ref:
    - domain.thought/**/*.md
    # ... 5 more
```

**after:**
```yaml
briefs:
  say:
    - define.rhachet.v3.md
    - define.agent-dir.md
```

added note: "unmatched briefs become refs automatically"

### fix 2: consistent token estimates

updated all estimates to use ~3k tokens for minimal say (2 briefs).

### fix 3: minimal say list

reduced from 7 say patterns to 2 core identity briefs.

### fix 4: added wisher review note

added: "wisher review needed: the say list above is minimal. wisher may want to expand based on which briefs are frequently referenced in daily work."

---

all issues from r2 have been addressed in 1.vision.md.

---

## additional findings on re-read

### issue 5: inconsistent usecase description

line 59 says: "only high-value briefs are said (rhachet identity, agent-dir, test-local)"

but test-local is no longer in the proposed boot.yml (we reduced to 2 briefs).

**fix:** update line 59 to match proposed boot.yml.

### issue 6: outdated edgecase

line 143 says: "new brief added | defaults to say (if no boot.yml glob matches ref)"

but we're not using ref globs anymore. the parenthetical is confusing.

**fix:** simplify to "defaults to ref (unmatched by say globs)".

wait — actually this is backwards! per computeBootPlan.ts:
- `say: ['glob']` → say matched, **ref unmatched**

so new briefs default to **ref**, not say! the vision was wrong.

**fix:** correct line 143 to say "defaults to ref".

### issue 7: over-reduction to 2 briefs

the wish said "not all of them need to be said" — not "only 2 should be said".

2 briefs may be too aggressive. the wisher should decide, not me.

**fix:** the vision already has "wisher review needed" note. this is sufficient.

---

## fixes applied (continued)

### fix 5: updated usecase 1 description

changed line 59 to remove "test-local" reference.

### fix 6: corrected edgecase table

"new brief added" now correctly says "defaults to ref".

---

## issue 8: maintenance coupling section contradicts edgecase table

line 187 said: "if you forget, it defaults to say (not ref)"

but line 143 (edgecase table) said: "defaults to ref (unmatched by say globs)"

**these contradict.** based on code research in r1, unmatched briefs become refs when `say: [globs]` is used.

**fix:** updated line 187 to say "defaults to ref (unmatched by say globs)".

---

## final re-read

re-read entire vision after fix 8. each assumption examined in detail:

### assumption 1: ~20k tokens is too many

- **evidence:** wisher stated: "briefs booted from .agent/repo=.this/role=any/briefs are too large"
- **source:** direct statement in wish, not inference
- **why it holds:** the wish exists specifically because of this concern

### assumption 2: refs are sufficient for discoverability

- **evidence:** refs appear in boot output with visible paths
- **mechanism:** mechanic reads file when needed
- **tradeoff:** vision notes this in "cons" section
- **mitigation:** wisher can expand say list if refs prove insufficient
- **why it holds:** tradeoff acknowledged, mitigation exists

### assumption 3: domain.thought/ rarely needed upfront

- **evidence:** most tasks don't require deep thought-route theory
- **inference:** this was inferred, not stated by wisher
- **mitigation:** vision flags for wisher review
- **why it holds:** inference acknowledged, wisher can adjust

### assumption 4: simple mode sufficient

- **evidence:** role=any is single role, not scoped to usecases
- **inference:** wisher said "use boot.yml capacity" — didn't specify mode
- **mitigation:** can evolve to subject mode if needed
- **why it holds:** reasonable first step, not premature optimization

### assumption 5: no code changes needed

- **evidence:** r1 traced code: computeBootPlan.ts, parseRoleBootYaml.ts
- **verification:** lines 67-77 implement exact behavior
- **why it holds:** verified in code, machinery exists

### assumption 6: say globs auto-ref unmatched

- **evidence:** computeBootPlan.ts line 75: `refRefs = input.refs.filter((r) => !saySet.has(r.pathToOriginal))`
- **mechanism:** unmatched briefs go to refRefs array
- **why it holds:** verified in code, no explicit ref globs needed

---

## implementation verified

boot.yml created and tested:

```yaml
briefs:
  say:
    - briefs/define.rhachet.v3.md
    - briefs/define.agent-dir.md
```

**result:**
- before: ~20,743 tokens
- after: ~3,763 tokens
- say = 2 briefs, ref = 17 briefs

all inconsistencies resolved. vision matches implementation.
