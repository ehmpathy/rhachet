# domain.term.choice.reason: enroll.attended

## .etymology

**attend**, from latin *attendere* — "to stretch toward", to be present at. its everyday sense is
exactly the one the domain needs: an *attended* checkout has a clerk; an *unattended* bag has no one
who minds it. the word asks about **presence on the far end**, and it has never asked whether that
presence is human.

that neutrality is what earns it the slot. every rejected peer below smuggles a human in.

## .the rejected peers

| candidate | why it was refused |
|---|---|
| `interactive` | names a property of the **terminal**, not of the conversation. it is the incumbent, and the incumbent is the defect — see below |
| `manned` | a human by construction, and the exact implication this term exists to drop |
| `supervised` | implies oversight and authority. a peer clone is neither supervisor nor subordinate |
| `watched` | implies observation without participation. the far end **speaks**; it does not merely watch |
| `live` | already overloaded in this repo — `getOneCloneLiveCountForActor` counts clones that run. one word, two concepts is `rule.forbid.domain-term-ambiguity` |

## .the measured defect it was coined from

dated 2026-09-16, on `vlad/fix-clone-say`.

`invokeEnroll.ts` carried:

```ts
interactive: !!process.stdout.isTTY
```

a clone that invokes `rhx enroll` does so through a pipe, so:

```
no tty → interactive: false → isCloneSocketEligible: false → socketEligible: false
       → a plain spawn, no socket
       ⇒ `clone say` against that peer is IMPOSSIBLE
```

**the measurement.** before the cure, an enroll from a clone's shell returned
`"socketEligible": false`. after, the same command from the same shell returned:

```json
{"outcome":"baked","serial":"cdb1768d-cb8b-496b-8ef5-db305af58561","slug":"peerdog","socketEligible":true}
```

and the peer answered a dispatch on the first try — `{"delivered":true,"verdict":"released",…}`,
with `PONG` read back off `clone get` 2.6s later.

🚨 **the sharpest statement of the harm**: the `--output json` machine handoff **advertised an address
that could not hear**. a supervisor read a `serial` and a `slug` off a successful enroll, dispatched to
it, and got a reach failure — from a clone the same payload had just reported as baked. so the defect
was not merely "a socket is absent"; it was a contract that **named a channel it had not opened**.

⇒ that is the same class the wish this term was coined inside exists to kill — **a channel that reports
a verdict it cannot justify** — one layer up, at the enroll rather than at the say.

## 🚨 .why the old word was so hard to see past

`interactive` is **correct about what it measures**. `isTTY` really does report a tty, and an enroll
at a tty really is attended. the term was not wrong — it was **narrow**, and narrowness is invisible
until the excluded case shows up.

⇒ that is the general shape worth a record: a stand-in that is *sufficient* gets mistaken for a
*definition*, and the mistake surfaces only when a new caller satisfies the definition and fails the
stand-in. the repair is to name the definition — which is what a term is for.

## .evidence

- **narrative** (`howto.domain-discovery`, the five whys): *"say fails"* → *"no socket"* →
  *"socketEligible false"* → *"interactive false"* → *"no tty"* → **"the tty was never the question"**
- **the wisher's words**, verbatim: *"rhx enroll should be available for oyu up to depth 1 clone"* —
  which names both this term's need and its bound in one clause
- **clamp**: `isCloneEnrollAttended.test.ts` (unit) + the `socketEligible` rows of
  `blackbox/cli/enroll.acceptance.test.ts` (acceptance)

## .invariants

- attended is **necessary, never sufficient** for a socket — `isCloneSocketEligible` still governs,
  and the depth budget still refuses independently
- `byClone` is read from the **caller's own env**, never from a flag. a flag would let an unattended
  CI job claim attendance and idle a socket forever
