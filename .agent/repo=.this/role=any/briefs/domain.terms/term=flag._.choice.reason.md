# domain.term.choice.reason: flag

## .etymology

old norse *flaga* → a cloth that flaps; then a signal run up a mast to be **read at a distance**.
the software sense keeps the signal half exactly: a flag is a mark a human sets so a program can
read their intent.

unix inherited it with the `-` convention (`ls -l`, `grep -i`) decades before `option` became the
api word for the same control, and the two words have coexisted since — `flag` on the human side
of the terminal, `option` on the library side. this repo takes the human side, because the whole
reason a cli exists is the human who types at it.

## .evidence — the word was already canonical, and only the code had not caught up

this is the rare case where the term did **not** need discovery: it needed an audit. the
ergonomist canon in `.agent/repo=ehmpathy/role=ergonomist/` already spends `flag` freely and
consistently:

| brief | line |
|-------|------|
| `rule.prefer.defaults-match-common-case` | *"keep flags for real variation — expose a choice only where the human genuinely chooses"* |
| `rule.prefer.defaults-match-common-case` | *"a forced flag whose value is the same in nearly every common case = nitpick"* |
| `rule.forbid.ambiguous-labels` | *"no name, flag, field, or output label may read more than one way"* |
| `def.ergonomic` | *"names read as a human expects — arg/flag/field names use plain domain words"* |
| `rule.require.errors-name-the-fix` | *"the concrete next move: the flag to add, the command to run"* |

so `flag` was the repo's word for this concept before any code named it. what `2026-08-06`
added was the first **contract** to carry it — `asKeyrackKeyReachFromFlag({ flag })` — which is
the moment `rule.require.domain-term-itemization` says a word owes the glossary a verdict.

## .disputes

### dispute: option — raised 2026-08-06 — status: RESOLVED (keep `flag`)
- raised.by = self, on an audit of a term i had reached for without a check
- claim = commander, the library that parses these, calls them **options** (`.option('--reach
  <label>')`). to use its word would keep one vocabulary from the terminal to the parser
- counter = three, and the second is the decisive one:
  1. the ergonomist canon (above) already spends `flag` on this concept, repeatedly. `option`
     beside it is a straight synonym
  2. **`options` is ALREADY spent, on a different concept.**
     `rule.require.input-options-pattern` declares `(input, options)` as a procedure shape where
     `options` means *pure configuration of an operation* — never a cli control. to reuse the
     word for a terminal flag would be one word over two senses, on two surfaces a reader moves
     between constantly
  3. a library's word is a library's concern. commander parses; the human types. the domain of
     a cli is the human's side, so the human's word is the true one
- resolution = keep `flag` in every contract of ours; `option` is forbidden **at the
  single-control position**. ⚠️ it is NOT forbidden as `opts` — see the next dispute

### dispute: should `opts` be renamed too? — raised 2026-08-06 — status: RESOLVED (keep `opts`)
- claim = if `option` is a forbidden synonym, then `opts.reach` — which appears in every cli
  handler — is a live violation of the forbid recorded above
- counter = they are not the same concept, and the forbid is positional. `opts` is the **bag**
  commander hands us, not one control; and it is a **vendor object**, so its name marks exactly
  where our code begins. to rename it would hide that boundary, which is the opposite of what
  a ubiqlang rule is for
- resolution = `opts` stays at the boundary. the conversion reads as one line, and that line is
  the seam: `asKeyrackKeyReachFromFlag({ flag: opts.reach })`

## .invariants

checkable rules a reviewer can hold the term to:

1. **`flag` names the control, never its value** — a parsed reach is a `reach`, not a `flag`
2. **`flag` is ours, `opts` is commander's** — a domain operation of ours takes `flag`; only a
   cli handler touches `opts`
3. **a flag is not boolean by implication** — most carry a value, so `switch`/`toggle` are wrong
   even where a flag happens to be boolean
4. **a flag is never positional** — `rule.forbid.positional-args` forbids the shape `arg` names

## .see also

- `term=reach._.choice._.md` — the value the flag this term was declared on carries
- `term=directive._.choice._.md` — a word for what a human ASKS FOR; a flag is how they ask
- `rule.require.input-options-pattern` (mechanic) — the `options` sense this term must not collide with
- `rule.forbid.positional-args` (mechanic) — why `arg` is the wrong word here
