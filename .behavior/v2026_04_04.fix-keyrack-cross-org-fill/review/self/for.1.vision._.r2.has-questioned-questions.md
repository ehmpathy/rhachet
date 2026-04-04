# self-review r2: has-questioned-questions

---

## review the vision's "open questions & assumptions" section

the vision currently says:

> ### no questions remain
> the fix is clear: extract org from slug instead of `repoManifest.org` in `fillKeyrackKeys.ts` line 257.

is this true? let me enumerate potential open questions:

---

## potential question 1: should we also update the env extraction?

**can this be answered via logic now?**
yes. in r2 assumptions review, i traced that `input.env` comes from the user's `--env` flag, and `getAllKeyrackSlugsForEnv` filters to keys where `spec.env === input.env`. so env is already correct.

**verdict**: [answered] — env extraction is not needed; `input.env` is already correct

---

## potential question 2: should we add a function `asKeyrackKeyOrg`?

**can this be answered via logic now?**
yes. the vision suggests inline extraction `slug.split('.')[0]!` as the minimal fix. a function can be added later if the pattern repeats.

**can this be answered via extant docs or code now?**
checked for similar functions:
- `asKeyrackKeyName` exists (extracts key name from slug)
- `asKeyrackKeyOrg` does not exist

so there's precedent for slug-parsing functions. but the fix is one location — inline suffices.

**verdict**: [answered] — inline extraction suffices; function is optional future work

---

## potential question 3: are there other places that incorrectly use `repoManifest.org`?

**can this be answered via code now?**
yes. i can grep for `repoManifest.org` usage.

in `fillKeyrackKeys.ts`, i found only one usage at line 257.

but let me check other files...

actually, this is a question for the research phase — more thorough search needed.

**verdict**: [research] — verify no other places have similar bug

---

## potential question 4: should the repo manifest write use slug's org?

**can this be answered via logic now?**
partially. the manifest write adds key to root keyrack.yml. this is intentional — fill registers keys so future unlock knows about them.

but if key is from extended manifest, should we write to extended manifest instead?

**does only the wisher know the answer?**
yes — this is a product decision. current behavior writes to root manifest. changing that would be scope creep.

**verdict**: [wisher] — but for this fix, defer to current behavior (write to root manifest). scope is limited to fixing the slug bug.

---

## summary of triage

| question | status | action |
|----------|--------|--------|
| env extraction needed? | [answered] | no, `input.env` is correct |
| add function? | [answered] | no, inline suffices |
| other places with same bug? | [research] | verify in research phase |
| manifest write target? | [wisher] | out of scope for this fix |

---

## update to vision needed?

the vision says "no questions remain" but we surfaced:
- [research] question about other places with similar bug

should update the vision's "open questions" section to include this.
