# domain.term.choice.reason: prefer

## .etymology

the slot was coined 2026-08-02 by the wisher, in the words *"we recommend or require"*, as the
grade pair on a repo-declared reach. the pair answers one question: **what should `fill` do when
it cannot provision a declared reach?**

- `require` → fail. the repo does not work without it.
- `prefer` → warn, continue. useful, not load-bearing.

the soft half was first written `recommend`, then dropped for `prefer` the same day — see the
dispute below.

## .disputes

### dispute: `recommend` vs `prefer` — raised 2026-08-02 — status: **RESOLVED (adopt `prefer`)**

- resolution = **`prefer` wins; `recommend` is a forbidden synonym.** the wisher settled it in
               one word ("yep, prefer"), which confirms the directive taxonomy is **repo-wide
               vocabulary**, not a review-only convention. the counter below is therefore
               overruled: a manifest grade and a review directive speak the *same* severity
               language, so they use the *same* words.

               note how little had to move: `require` was already the extant word at a matched
               severity, so only the soft half was drift. the pair is now fully conformed.

⚠️ the original argument is preserved below, because the *reason* the counter lost is the
durable lesson — a repo-wide taxonomy binds every surface, not only the one it was written for.

- raised.by  = me, at the moment `recommend` was written down
- claim      = the repo **already** grades directives with a fixed, published pair, and the
               soft half of that pair is **`prefer`**, not `recommend`:

  | directive | severity | source |
  |-----------|----------|--------|
  | `require` | blocker — must do | `define.directives.terms=forbid_avoid_prefer_require` |
  | `forbid`  | blocker — must not do | same |
  | `prefer`  | nitpick — encouraged | same |
  | `avoid`   | nitpick — discouraged | same |

  the reach grades map onto that taxonomy **exactly**: `require` = must (fail), soft = should
  (warn). so the extant word for the soft grade is `prefer`, and `recommend` is a second word
  for one concept — the drift `rule.forbid.domain-term-synonyms` calls a **blocker**.

  note the asymmetry that makes this sharp: `require` **re-uses** the extant word at a matched
  severity, so the pair is already half-conformed. only the soft half drifted. a
  `require`/`prefer` pair would be fully consistent with a taxonomy every brief in the repo
  already speaks.

- counter    = three reasons `recommend` may still be right:
  1. **the taxonomy governs a different domain.** `rule.$directive.$topic` grades **review
     findings** — advice to a *reader*. these grade what a **command does** — behavior, not
     severity. one is a judgment, the other a control-flow branch.
  2. **`prefer` reads wrong on a manifest.** *"prefer: github://org=ehmpathy"* invites the
     question "prefer over what?" — `prefer` is comparative by nature, and no alternative is on
     offer here. `recommend` is not comparative and reads plainly.
  3. **the wisher chose it**, in a context where they had every reason to reach for `prefer`
     and did not.
- resolution = **none yet.** if the taxonomy is repo-wide vocabulary, `prefer` wins and this is
               drift. if it is scoped to review directives, `recommend` stands and the two live
               apart. **the wisher should settle it**; the manifest field is unreleased, so
               either way it is a **clean rework**.

## .evidence

- **discovery: the collision was found by itemization, not by review.** the word was written
  into the vision without objection; the drift only surfaced when the term was split out for the
  glossary and set beside the extant directive words. that is precisely the failure mode
  `rule.require.domain-term-itemization` exists to catch — a synonym that reads fine in prose
  and fractures the vocabulary.
- **the extant taxonomy** is stated in
  `.agent/repo=ehmpathy/role=mechanic/briefs/practices/lang.terms/define.directives.terms=forbid_avoid_prefer_require.md.min`
  and is used by **every** rule filename in the repo — so it is not a fringe convention.
- **invariants** (as a dobj, `KeyrackKeyReachDirective`):
  - exactly two directives; a reach declared with no directive is a parse error, not a default
  - a directive governs `fill` **only** — it never gates `unlock`, and grants no access
  - a repo's directed reaches are a **floor**: they may not remove a reach a host holds

## .see also

- `term=reach._.choice._.md` — the two axes (requirement vs possession) these grades sit on
- `term=fill._.choice._.md` — the operation these grades steer
- `rule.forbid.domain-term-synonyms` — the rule this dispute is opened under
