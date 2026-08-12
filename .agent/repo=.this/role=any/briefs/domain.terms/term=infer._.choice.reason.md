# domain.term.choice.reason: infer

## .etymology

latin *inferre*, "to carry in" — to reach a conclusion the evidence did not state outright. the word
entered this repo through `inferKeyGrade`, where a key's grade is neither stored nor asked for but
carried in from its vault + mech. six more `infer*` operations followed the pattern, and the pattern
was never vetted against the verb rule.

## ⚠️ .disputes

### dispute: infer — raised 2026-08-10 — status: **OPEN**

- raised.by = the driver, at the `learn.domain.terms` sweep after a round that touched
  `inferKeyrackMechForSet`
- claim = `infer` names a **distinct** operation kind and deserves a sanctioned place beside
  `get` / `set` / `gen` / `del`. its distinction: a `get` is answerable from what the process
  already holds, while an `infer` may **exhaust derivation and prompt a human**.
  `inferKeyrackMechForSet` is the proof case — it is `async`, it calls `promptLineInput`, and it
  throws a `ConstraintError` when the human's answer is out of range. to call that `getOne…` would
  promise a pure read and deliver an interactive one, which is the surprise
  `rule.require.get-set-gen-verbs` exists to prevent
- counter = `rule.require.get-set-gen-verbs` is explicit that *"deterministic derivation stays a get
  compute-subtype"* and that an unsanctioned prefix is a **blocker**. and the evidence is mostly
  against the claim: **6 of the 7** `infer*` operations are synchronous, pure, and prompt nobody —
  they are `get` compute-subtypes under a synonym. a word justified by one call site out of seven is
  a word that spread by copy, not by sense
- resolution = **not settled.** it cannot be settled from inside a keyrack-reach wish: either
  outcome renames operations across `src/domain.operations/keyrack/**` and
  `src/domain.operations/invoke/**`, which is a repo-wide contract change and a scope leak
  (`rule.forbid.scope-leaks`, and the wish's own `.scope` bound)

## .the two candidate outcomes

| outcome | what happens | cost |
|---------|--------------|------|
| **A — `infer` is a synonym** | all 7 become `getOne*` compute-subtypes | 7 renames + their tests; the interactive one then lies about its purity |
| **B — `infer` earns its place** | it joins the sanctioned set, defined as *derive-or-ask*; the 6 pure ones become `getOne*`, so `inferKeyrackMechForSet` stands alone under it | 6 renames + an org-brief change to `rule.require.get-set-gen-verbs` |

**the driver's best guess is B**, on the ground that the derive-or-ask distinction is real and worth
a word — a caller must know whether an operation can block on a human. but B costs an edit to an
**org-wide mechanic brief** (`repo=ehmpathy/role=mechanic`), which is not this repo's to make
unilaterally. so it is flagged, not taken.

⚠️ **either outcome renames at least 6 operations.** that is why the `.choice._.md` carries
`term.status = DISPUTED — open` and the instruction to add no new `infer*` meanwhile: every one
added before this closes is one more site to rename.

## .evidence

```
grep -n 'export const infer[A-Z]' src/**   →  7 operations
```

the split that makes it a dispute rather than a violation:

- **prompts a human** — `inferKeyrackMechForSet` (`async`, `promptLineInput`, `ConstraintError` on a
  fumbled answer). this round's `keyrack fill` defect ran straight through it, which is how the
  prefix came under the eye at all
- **pure derivation** — the other six. `inferKeyGrade` derives from `{ vault, mech }`;
  `inferKeyrackVaultFromKey` from a key spec; `inferKeyrackKeyStatusWhenNotGranted` from an
  inventory row. every one is answerable from data in hand

## .the honest note on why this surfaced late

`infer` composes 7 declared operations and has sat in this repo across the whole drive without a
term file. it surfaced only when a round happened to **modify** one of them
(`inferKeyrackMechForSet`, for the error-word correction) and the sweep split its name into terms.

> a term recorded only when a round touches it is a glossary with holes shaped like the code nobody
> edited. the sweep catches what the round touched — it is not an audit of what exists.

that gap is worth its own pass someday: split **every** declared dobj/dop name in `src/` into terms,
and diff that set against the 28 clusters. this file is one instance of what such a pass would find.

## .see also

- `rule.require.get-set-gen-verbs` (mechanic, org-wide) — the rule this disputes
- `rule.forbid.domain-term-synonyms` — the rule that forbids a drift instead of a dispute
- `howto.domain-term-disputes.[guide].md` — the pattern this entry follows
- `term=decide._.choice._.md` — a peer verb that was settled rather than left open
