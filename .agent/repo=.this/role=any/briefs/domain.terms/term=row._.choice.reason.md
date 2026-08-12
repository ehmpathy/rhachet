# domain.term.choice.reason: row

## .etymology

`row` comes from the shape a socket response actually has: a `keys: [...]` array, one element
per held key. each element is a **row** in that list, the way a query result has rows.

it was coined to give the **wire projection** a name of its own, so a field could be declared
once rather than typed inline at the send site and again at the receive site.

## .why not the alternatives

| rejected | why |
|----------|-----|
| `dto` | jargon from another tradition; says "data transfer object" and carries a whole framework's habits with it. names the mechanism, never the concept |
| `payload` | already spent in this repo — the daemon protocol's request envelope is `{ command, payload }`. to reuse it for the response element would overload one word onto two levels of the same message |
| `wire` | an adjective about the medium, not a noun about the concept. `DaemonKeyWire` reads as a cable |
| `record` | implies persistence. a row is transient by nature — it exists for one socket read and is gone |
| `entry` | already spent: `daemonKeyStore.entries()` yields **stored** grants, which is the opposite side of the boundary a row marks |

`payload` and `entry` are the decisive two: both are live in this exact subsystem, one level away.
either choice would have put two senses on one word in files that sit beside each other.

## .the drift that named it

`row` earned its cluster because the concept **failed twice in the same way**, and both failures
were the concept's own boundary left unenforced:

| date | row | the lie |
|------|-----|---------|
| 2026-08-04 | `DaemonKeyRow.expiresAt` | declared `number`; the server sent an iso stamp |
| 2026-08-06 | `DaemonStatusRow.expiresAt` | **the same defect**, in the twin, unrepaired by the first fix |

and a third, found alongside the second and worse than either:

`DaemonStatusRow.ttlLeftMs` declared `number` while the server computed `Infinity`. the socket
is JSON, and `JSON.stringify(Infinity)` is the string `"null"` — so the value **already arrived
as `null`** while both sides declared `number`. `Math.round(null / 1000 / 60)` is `0`, so a key
that never expires rendered as `expires in: 0m`.

> **that is the whole argument for the term.** a row is the place where a domain fact meets a
> codec that cannot carry it. to leave that place unnamed is to leave it unchecked, and each of
> the three lies above lived exactly there.

## .the sub-rule the term carries

**each row is declared accurately for ITSELF, never copied from its twin.**

the two rows differ legitimately: `DaemonKeyRow.expiresAt` is `IsoTimeStamp`,
`DaemonStatusRow.expiresAt` is `IsoTimeStamp | null`. a GET row exists only for a grant handed
back on request; a STATUS row renders every held key, a set that covers one with no expiry at
all.

so a row has **two** failure modes, and they pull opposite ways:

```
drift apart   → the 2026-08-04 / 08-06 defects (one twin fixed, one not)
copy across   → a STATUS row that forbids null because the GET row does
```

the term exists to hold both in view at once.

## .evidence

**the clamp that now enforces it** — `handleCommands.test.ts [case3]`, at COMPILE grain:

```ts
const rows: DaemonStatusRow[] = handleStatusCommand({}, { keyStore, homeHash }).keys;
```

the assignment **is** the assertion. dogfooded 2026-08-06: `expiresAt` restored to `number` →
`tsc` failed and named the seam:

```
error TS2322: Type '{ … expiresAt: (string & IsoTimeStamp) | null; … }[]'
  is not assignable to type 'DaemonStatusRow[]'.
```

**why the clamp matters more than either fix.** both prior repairs were applied by hand, to one
twin. a fix that must be re-applied by hand at each twin is a fix that will be missed — and was,
for two days. the clamp turns the next drift into a build failure.

## .the open follow-on

only the STATUS pair is clamped. the GET pair is `KeyrackKeyGrant` ↔ `DaemonKeyRow`, and those
are a **class** and an **interface** rather than two object literals, so the same one-line
assignment does not express it. that asymmetry is why the clamp was not simply duplicated —
recorded here so the gap is a known one rather than an oversight.

## .see also
- `rule.require.shapefit` — a type that does not fit is a defect, bitten or not
- `define.term.arch.adapters` — the adjacent boundary vocabulary
- `term=reach._.choice.reason.md` — the axis whose addition first exposed the two-declaration seam
