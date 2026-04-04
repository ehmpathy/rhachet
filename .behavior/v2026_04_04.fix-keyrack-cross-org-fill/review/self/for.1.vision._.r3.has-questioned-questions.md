# self-review r3: has-questioned-questions

round 3 — fresh eyes on questions triage.

---

## re-read the vision's questions section

the vision now says:

> ### questions
> | question | status | action |
> |----------|--------|--------|
> | are there other places that incorrectly use `repoManifest.org`? | [research] | grep for `repoManifest.org` usage across codebase |

is this the only open question? let me think through the fix more deeply.

---

## question review: is there really only one research question?

**can we answer the research question now?**

actually, yes — let me try. grep for `repoManifest.org` usage.

in the fill file, we know line 257 is the issue. are there other usages?

based on my prior code read:
- `fillKeyrackKeys.ts` uses `repoManifest.org` only at line 257
- other keyrack commands (set, unlock, get) take explicit `--org` or infer from slug

but i should verify this in research phase with a proper grep. [research] is appropriate.

**verdict**: [research] is correct ✓

---

## question review: any missed questions?

let me think about what else could go wrong:

1. **what if slug doesn't contain org?**
   - can this happen? no — hydration always constructs slugs as `$org.$env.$key`
   - if slug is malformed, `slug.split('.')[0]` returns garbage
   - but hydration validates this
   - **verdict**: not a question — hydration guarantees slug format

2. **what if extended manifest's org is absent?**
   - hydration requires `explicit.org` to be present
   - if absent, hydration fails with BadRequestError
   - **verdict**: not a question — hydration validates org presence

3. **what about the prompt text with wrong org?**
   - prompt comes from vault adapter, which uses `input.org`
   - if we fix the org passed to `setKeyrackKey`, prompt shows correct org
   - **verdict**: not a question — prompt follows from fix

4. **what about env=all keys?**
   - env=all slugs are `$org.all.$key`
   - org extraction from slug still works
   - **verdict**: not a question — slug format is consistent

---

## issue found: vision updated, confirm accuracy

in r2.has-questioned-questions i said "update to vision needed" and then updated it.

let me verify the update was correct:
- added questions table with [research] item ✓
- added answered questions section ✓
- kept fix location section ✓

**verdict**: update is accurate ✓

---

## summary

no new questions found. the vision correctly captures:
- one [research] question about other `repoManifest.org` usages
- two [answered] questions about env and function extraction

all questions are triaged appropriately.
