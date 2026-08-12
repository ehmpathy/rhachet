# domain.term: adhoc

term.chosen   = adhoc
term.kind     = adj
term.synonyms.forbidden:
- manual
- undeclared
- unmanaged
- local
- implicit
- informal

## .what

cut **for this one purpose, by this one human, on this one machine** — and therefore named in no
repo manifest.

an adhoc reach is one a human unlocked by hand. it is legal, deliberate, and invisible to
every manifest-driven sweep, because a sweep reads what the **repo** declares (q8) and this was
never a repo's business.

## .the pair it completes

| the reach is... | where its record lives | who holds it |
|-----------------|------------------------|--------------|
| **declared** | the repo's `.agent/keyrack.yml`, `reaches:` under a key | every developer here — `fill` provisions it |
| **adhoc** | the host manifest + the daemon, this machine only | the one human who cut it |

`declared` ↔ `adhoc` is the **provenance-of-authorization** axis. it is NOT a quality axis: an
adhoc reach is not lesser, not temporary, and not a workaround. it is the ahbode↔whodis case the
wisher named — a human who bridges two orgs for their own reasons, which no repo should force on
their peers.

## .the operational test

> a held reach is **adhoc** when its `(slug, reach)` address is absent from the declared set —
> `KeyrackKeySpec.reaches`, expanded per env.

so the word is checkable, not a vibe. `getAllKeyrackReachesHeldAdhoc` performs exactly that
subtraction.

## ⚠️ .why the name says BOTH `Held` and `Adhoc`

`getAllKeyrackReachesHeldAdhoc` reads redundant at a glance — surely a reach nobody holds is
not worth a word? it is not redundant. the two halves name two different facts:

- **`Held`** names the **source**: the daemon, asked live. never the host manifest, which answers
  what is *configured* and would name a reach a human deliberately relocked
- **`Adhoc`** names the **filter**: subtract each reach the repo declares

drop either word and the operation's contract goes ambiguous.

> ⚠️ the three lines above spelled that word `territor`+`y` until 2026-08-10 (written split so a
> sweep of this dir cannot silently rewrite the sentence that records the sweep). it is now a
> forbidden synonym of `reach` **everywhere**, prose included — see `term=reach._.choice._.md`.

## .refs
- `src/domain.operations/keyrack/reach/getAllKeyrackReachesHeldAdhoc.ts`  # the declared dop
- `src/domain.operations/keyrack/cli/asKeyrackReachOmittedNotice.ts`  # `heldAdhoc` — the contract field
- `src/contract/cli/invokeKeyrack.ts`  # `keyrack source` — one of two announce sites
- `src/domain.operations/keyrack/getKeyrackKeySecrets/getKeyrackKeySecrets.ts`  # the other

## .reason
see the ref-level cluster beside this choice:
- `term=adhoc._.choice.reason.md` — etymology, the `undeclared` dispute, evidence, invariants
