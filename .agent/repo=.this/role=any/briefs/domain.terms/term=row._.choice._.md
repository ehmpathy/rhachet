# domain.term: row

term.chosen   = row
term.kind     = noun
term.synonyms.forbidden:
- dto
- payload
- wire
- record
- entry

## .what

one domain object **as it crosses the daemon socket** — the wire projection of a grant, named
and declared on its own rather than left inline at the send site.

a row is deliberately **not** the domain object. `KeyrackKeyGrant.expiresAt` is an
`IsoTimeStamp`; the same fact on a row is whatever JSON can carry. the row exists to make that
gap **visible and declarable** instead of implicit.

```
KeyrackKeyGrant   the domain object — rich, class-backed, iso-typed
DaemonKeyRow      the same key, as GET sends it
DaemonStatusRow   the same key, as STATUS sends it
```

three shapes, one concept, on purpose. two of them are rows because the socket is a boundary
and a boundary deserves its own vocabulary.

## .why the term earns a place

the row's own declaration states the job it was coined for:

> *"the row is named once so a field cannot land on the response type and be forgotten on the
> generic — the same wire/domain seam `DaemonKeyRow` closes for GET"*

that is a **named** concept with a **stated purpose**, not incidental jargon. and it is
load-bearing for the reach axis: `reach` had to be added to the domain object AND to each row,
in files the compiler does not link.

## .the rule a row carries

**each row is declared accurately for ITSELF, never copied from its twin.**

`DaemonKeyRow.expiresAt` is `IsoTimeStamp`; `DaemonStatusRow.expiresAt` is
`IsoTimeStamp | null`. that difference is not sloppiness — a GET row exists only for a grant the
daemon hands back on request, while a STATUS row renders **every** held key, a set that covers
one stored with no expiry at all.

to copy one row onto the other is as wrong as to let them drift apart.

## .refs
- `src/domain.operations/keyrack/daemon/sdk/src/domain.operations/daemonAccessGet.ts:21`     # DaemonKeyRow
- `src/domain.operations/keyrack/daemon/sdk/src/domain.operations/daemonAccessStatus.ts:17`  # DaemonStatusRow
- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/handleCommands.test.ts`    # the clamp that holds each row to its server

## .reason
see the ref-level cluster beside this choice:
- `term=row._.choice.reason.md` — etymology, the twin drift that named it, evidence
