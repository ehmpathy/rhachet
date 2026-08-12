# domain.term.choice.reason: omitted

## .etymology

latin *omittere*, "to let go, lay aside" — to leave out what belonged. the word carries no blame
and no choice, which is exactly its value here: an omitted key was **asked for** and **not
delivered**, and the render owes a reason rather than an apology.

it entered the repo on `unlockKeyrackKeys`'s return shape — `{ unlocked, omitted }` — where the
`omitted` array carries a `reason` per row (`'absent' | 'lost' | 'remote'`). the reach work then
reused it for a second kind of could-not: a reach a flat variable namespace cannot carry.

## ⚠️ .the deferral that was wrong — 2026-08-10

this term was **flagged and deferred one round before it was written**, and the deferral does not
survive its own argument. the `progress.md` entry read:

> *"`omitted` — engaged via `asKeyrackReachOmittedNotice`, but the concept it names is already
> carried by `notice`. flagged as a candidate, not forced"*

three faults in that:

1. **`notice` does not carry it.** `notice` is the **render** (a tree that names uncarried work);
   `omitted` is the **state of the rows inside it**. one is a noun for the message, the other an
   adjective for the items. they compose — neither substitutes
2. **it is a published contract field**, not a comment word. `unlockKeyrackKeys` returns it and the
   `--json` output serializes it (`JSON.stringify({ unlocked, omitted })`), so a consumer parses
   the literal key. `rule.require.domain-term-itemization` is at its strongest exactly here
3. **a live synonym sat beside it, unexamined.** `fillKeyrackKeys` uses `skipped` for what looked
   like the same concept. a deferral left that pair unjudged — the precise failure mode
   `rule.forbid.domain-term-synonyms` exists to prevent

> the round had already SETTLED the word by its release onto a contract. to defer it was to file a
> decision as a question.

## .the judgment the deferral skipped — `omitted` ≠ `skipped`

read against the code, the two are **distinct**, and that is what makes the record worth its keep:

```ts
// unlockKeyrackKeys.ts:64  — could NOT be done
omitted: { slug: string; reason: 'absent' | 'lost' | 'remote' }[];
```

```ts
// fillKeyrackKeys.ts:51    — did not NEED to be done
status: 'set' | 'skipped';
```

`fill` marks `skipped` when a probe finds the key **already vaulted** (`:293`, `:338`) and tallies
it in the summary beside `set` (`:448`). the end state is correct and no work was lost. `unlock`
marks `omitted` when the key is **not there to give**.

so the axis is **whether the work was needed**, and both words are earned:

- a skip is a **success** — already handled
- an omission is a **shortfall** — asked for, not received

had the deferral held, the next traveler would have met two words for one apparent concept and
"unified" them — which would erase a real distinction across two published contracts.

## .evidence

| surface | word | shape |
|---------|------|-------|
| `unlockKeyrackKeys` return | `omitted` | `{ slug, reason: 'absent' \| 'lost' \| 'remote' }[]` |
| `keyrack unlock --json` | `omitted` | serialized key a consumer parses |
| `asKeyrackReachOmittedNotice` | `omitted` | the render of reaches not carried |
| `emitKeyrackReachOmittedIfAny` | `omitted` | the shared emit, both async surfaces |
| `fillKeyrackKeys` result | `skipped` | `status: 'set' \| 'skipped'` + a summary tally |

## .invariants

1. an omitted row always carries a **reason** — an omission with no cause is a silence, which is
   the defect the notice exists to prevent
2. an omitted row is always **reported**; it never passes unseen (`rule.forbid.failhide` applied
   to a success path)
3. an omission does **not** fail the command — `unlock` still exits 0 with keys omitted, because
   the keys it could deliver were delivered
4. `skipped` never appears on an unlock/source surface, and `omitted` never on a fill result — the
   two words do not cross

## .see also

- `term=notice._.choice._.md` — the render an omission earns; the noun this adj feeds
- `term=held._.choice._.md` — the status an omitted reach row reports
- `rule.forbid.domain-term-synonyms` — why the `skipped` pair had to be judged, not deferred
- `im_an.obsessive_learner.for.domain.terms.md` — *"capture now — a settled term is not deferrable"*
