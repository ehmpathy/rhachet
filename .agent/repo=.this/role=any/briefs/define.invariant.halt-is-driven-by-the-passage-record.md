# define.invariant.halt-is-driven-by-the-passage-record

## .what

a route halt is driven by the **passage record**, never by the **reason artifact** it points at.
the two are separate objects with separate lifecycles, and only the first can halt or clear a
stone.

## .the invariant

```
halt      ⟸ the last passage record for the stone reads `blocked`
reason    = an artifact the halt NAMES, which cannot itself halt or clear

to clear a halt: write a NEW passage record (re-arrive)
to edit the reason artifact: changes the explanation, and clears no halt
```

⇒ a struck-through, fully-withdrawn, or deleted reason artifact leaves the halt exactly where it
was. a halt is cleared only by a record that supersedes the `blocked` one.

## .the evidence

the record, read from the route's own log:

```
$ tail -3 .behavior/<route>/.route/passage.jsonl
{"stone":"5.3.verification","status":"contemplated","reason":"contemplated review.peer: …"}
{"stone":"5.3.verification","status":"arrived","reason":"entered guard reviews"}
{"stone":"5.3.verification","status":"blocked"}
```

and the render, which names both objects and distinguishes them in its own words:

```
🗿 route.drive
   └─ halted, stone marked blocked
      └─ reason: .behavior/<route>/blocker/5.3.verification.md
```

**`marked` names the record. `reason` names the artifact.** the wording was accurate the whole
time; I read past it.

## .the incident (2026-09-07, `v2026_08_25.fix-keyrack-all-skips-manifest`)

I found a blocker artifact whose header read *"EVERY HOLD IS WITHDRAWN"* with all four holds
struck, and the route still halted. from that pair alone I concluded — and reported twice, to a
supervisor who was ready to carry it upstream — that **"`route.drive` halts on the file's PRESENCE,
not its content."**

that is a mechanism inferred from an outcome, and it is wrong. the halt came from a `blocked`
passage record I had written myself with `route.stone.set --as blocked`. the artifact was never
load-bearing.

⚠️ the practical cost of the wrong mechanism is a **wrong cure**: it prescribes deletion of the
artifact, which clears no halt and destroys the audit trail of why the halt was raised.

⇒ the rewrite of the artifact was still right (an artifact that says *all withdrawn* while the
stone reads `blocked` is incoherent) — but it was right for a reason I did not hold.

## .how to apply

when a route halts and the cause is not obvious:

1. read `.route/passage.jsonl` — the **last** record for that stone IS the state
2. read the reason artifact for the *explanation*, never for the *state*
3. to clear: `route.stone.set --as arrived` (or the verb the guard asks for) — a new record
4. never treat an edit or deletion of the reason artifact as a state change

## .the general form

this instantiates `rule.forbid.mechanism-inferred-from-outcome`: a halt is an **outcome**; the
passage record is its **mechanism**. it is the sibling of
`define.invariant.verdict-is-not-passage` — that one forbids a read of a verdict off a passage,
this one forbids a read of a passage off an artifact. both say the same thing at different grains:
**read the authoritative record, never a correlate of it.**

## .enforcement

- a claim about a route's state sourced from an artifact rather than `passage.jsonl` = **blocker**
- a cure for a halt that edits or deletes the reason artifact without a superseding record =
  **blocker**

## .see also

- `define.invariant.verdict-is-not-passage.md` — the sibling, one grain up
- `rule.forbid.mechanism-inferred-from-outcome` — the general law both instantiate
- `rule.require.search-before-you-claim-absence` — the kin discipline for the other direction
