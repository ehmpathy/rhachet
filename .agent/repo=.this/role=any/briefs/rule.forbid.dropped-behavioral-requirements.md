# rule.forbid.dropped-behavioral-requirements

> **a behavioral requirement, once stated, is never dropped. it is inventoried, clamped, and proven —
> and only the wisher may change what it requires.**

## .what is forbidden

- a requirement a wish, a vision, or a human states that never reaches
  `behavior/inventory.of=requirements._.md`
- an open question about a requirement closed by "answered from code" — code shows what IS, never what
  was asked for
- a design, a review, a refactor or a "by design" note that narrows what an inventory entry requires
- a proof test for an inventory entry deleted, skipped, or weakened, so the behavior it guards may
  regress silently
- an entry marked `proven` with no proof test cited by path

## .what is allowed

- the wisher amends an entry — by name, in the entry, with the date
- an entry stays `owed` while its clamp and proof are built; owed is visible, never silent

## .why

a requirement that lives only in one behavior's wish is gone once that behavior closes. the next
design reads the code, not the wish, and the code is silent about what it fails to do.

🔴 **measured 2026-10-02.** `rhx init --roles -xyz` was meant to drop `xyz` from `prepare:rhachet`.
`v2026_07_07.fix-rhx-init` asked *"should incremental interact with `--prep`?"*, marked it answered
from code, and logged *"`--prep` narrows to adds in incremental mode"* as *"by design"*. the removal
unlinked `xyz`; the next install linked it back. every test was green, because no test held the
requirement (`inventory.of=requirements.case=1`).

## .how

| when… | then… |
|---|---|
| a human states a behavior ("X must do Y") | 🔴 the strongest cue. add an inventory entry the same day, status `owed` |
| a vision lists an open question about a behavior | answer it from the wisher, never from the code |
| a change touches a surface an entry names | read the entry first; its proof must stay green |
| a reviewer flags that a change narrows a behavior | check the inventory; if an entry covers it, it is a blocker |
| you would write "by design" beside a gap in a behavior | stop. a gap is owed, or the wisher amends the entry |
| an entry's proof is red | fix the code, never the proof |
| you replace a design | 🔴 inventory what it did that no entry names, first — `rule.require.inventory-incidental-behaviors-before-a-redesign` |

## .enforcement

- a stated requirement absent from the inventory = **blocker**
- a requirement narrowed or dropped without the wisher's amendment = **blocker**
- a proof test deleted, skipped or weakened = **blocker**
- an entry `proven` with no proof cited by path = **blocker**

## .see also

- `behavior/inventory.of=requirements._.md` — the inventory this rule guards
- `rule.require.search-before-you-claim-absence` — its peer: read before you assert
