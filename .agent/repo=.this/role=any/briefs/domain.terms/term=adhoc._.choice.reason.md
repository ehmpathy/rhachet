# domain.term.choice.reason: adhoc

## .etymology

latin *ad hoc* — "for this". it names the **motive**, which is what
`howto.domain-discovery` asks a term to do: not how the reach got there, not what record it
lacks, but *why it exists at all* — a human needed to reach one place, once, for their own reasons.

that motive is exactly what separates it from a declared reach. a declared reach exists because
**the repo** needs it, so every developer here needs it. an adhoc reach exists because **this
human** needs it, so no peer of theirs does.

## .disputes

### dispute: undeclared — raised 2026-08-09 — status: RESOLVED (keep `adhoc`)

- raised.by = self, at the moment the term was coined
- claim = `undeclared` is the more precise word, and it is **already half-built**: `declared` is a
  live term in this domain (q8 — "the repo manifest declares reaches"; `getAllKeyrackFillTargets`
  walks declared targets). the operational test is *literally* set subtraction against the declared
  set, so a word that names that complement says exactly what the code does. `adhoc` is a gloss on
  motive; `undeclared` is the check itself
- counter = three:
  1. **a term defined by an absence decays when the thing it lacks is renamed.** if the manifest
     key `reaches:` were ever re-shaped, `undeclared` would still parse yet would point at no
     artifact a reader can find. `adhoc` names a fact about the human, which no schema change
     touches
  2. **`undeclared` is true of reaches no one holds, too.** the set we need is the
     *intersection* — held AND absent from the manifest. `adhoc` connotes a deliberate act, so it
     carries the "someone did this on purpose" half that `undeclared` does not
  3. **the layfolk word is `adhoc`.** a human says "i unlocked it ad hoc"; no one says "i hold an
     undeclared reach". `howto.domain-discovery` move 1 says adopt the word the expert AND the
     layfolk both reach for
- resolution = keep `adhoc`; record `undeclared` as a forbidden synonym. **the claim's one true
  point is preserved as invariant 1 below** — the word is bound to the check, so the precision
  `undeclared` offered is kept without the word that would decay

## .evidence

**the declared dop + the contract field.** `getAllKeyrackReachesHeldAdhoc` is a domain operation
this repo declares, and `heldAdhoc` is a field on `asKeyrackReachOmittedNotice`'s input — the two
strongest triggers `rule.require.domain-term-itemization` names.

**scenario timeline — the gap the word closes**

```
given  a repo whose keyrack.yml declares NO reaches
and    a human who ran `keyrack unlock --key API_KEY --reach vlad@ehmpathy.com`
when   that human runs a bare `keyrack source`
then   before this term:  the reachless credential is emitted, in total silence
and    the human meets a 404 from the org they thought they had unlocked
and    after this term:   the reach is named on stderr, with the one-key fix beside it
```

**the boundary this closed, stated by its own tests.** the pair
`keyrack.source.reach [t3]/[t5]` (adhoc, formerly reach-blind) and
`keyrack.source.reach.enumerate` (declared) were written to *document* this gap as a known edge.
the word arrived when the gap was closed rather than merely described.

⚠️ **the term is younger than the concept, and that cost a round.** the blocker record carried
*"ad-hoc reaches are invisible by design"* for several rounds, with a stated reason —
*"needs a daemon protocol addition"* — that was false: `daemonAccessStatus` already yields one row
per `(slug, reach)`, with `reach` on the row. an unnamed concept is easy to park; a named one
invites the check that unparks it.

## .invariants

checkable rules a reviewer can hold the term to:

1. **`adhoc` means "held, and its address is absent from `KeyrackKeySpec.reaches`"** — never a
   looser sense (informal, temporary, low-grade). the word is bound to that subtraction
2. **the held source is the DAEMON, never the host manifest** — the manifest answers what is
   configured, a wider set that names reaches a human deliberately relocked
3. **an adhoc list is filtered to the slugs the caller's own sweep touched** — the daemon holds
   every key on the host, so an unfiltered list names another repo's reaches: true, irrelevant,
   and a distraction from the question asked
4. **an adhoc reach is announced, never refused** — the namespace is the constraint, not the
   ask (`asKeyrackReachOmittedNotice`'s `.why not a refusal`)

## .see also

- `term=reach._.choice._.md` — the axis this adjective qualifies
- `term=sweep._.choice._.md` — the sweep that reads the DECLARED set, and so cannot see this one
- `term=held._.choice._.md` — the status an adhoc row reports, and why it is not `granted`
- `rule.require.domain-term-itemization` (learner) — the rule this cluster discharges
