# F02 — the probe returns a classification, never screen content

**rework** clean · **status** OPEN · **confidence** 68%

## .the fork, stated fairly

the issue asks, verbatim:

> *"read the live input line's **content**, not just whether OUR message is present in it"*

| option | cost |
|---|---|
| **A** — reply with a classification: `{ focus, input: 'clear' \| 'dirty', countInInput, countOnScreen }` | narrower than the stated ask. a caller cannot show a human what the input holds |
| **B** — reply with the input line's text | the brain's screen holds whatever the human works on. any same-user process could then read a human's live session through a socket built to WRITE |

## .taken, and why

**A.** the six verdicts and both pre-checks need two enums and two counts — not one byte of content.
so B buys no verdict beyond A.

⇒ the ask's **motive** is served: the issue wants the say to know the line is dirty with text it did
not author, and `input: 'dirty'` + `countInInput: 0` states exactly that. it is the content itself
that is unnecessary, not the knowledge.

🔴 **a multi-line message does not raise B's value.** the fields range over the input **REGION**
(every rendered row it occupies), because `asCloneDispatchFrame` maps interior newlines to a
soft-newline so a block lands as one input. A reads N rows and replies with **two enums and two
counts** whatever N is; B replies with N rows of a human's live session. the region widens what is
*read*; A's claim is about what is *returned*.

🟡 **the last two fields are counts, and a count is a classification** — it exports no more of a
human's session than a boolean does, and it closes a false green a presence test admits
(`1.vision.yield.md`, `every condition is a RISE`).

## 🔴 .the NEEDLE makes A a bandwidth bound, not a knowability bound

A's reply does NOT make a session unreadable — it makes a session read **slower**. the field on the
REQUEST side is why:

```
→ { kind: 'probe', needle }          ← the caller CHOOSES the needle
← { …, countInInput, countOnScreen } ← the reply counts THAT string
```

⇒ `countOnScreen` answers *"how many times does the string I just named appear on this human's
screen?"*, asked once per round trip, over a local socket, at whatever rate the caller likes. a
caller probes `a`, `b`, `c` … for a histogram, then 2-grams, then extends each hit greedily. **that
is a content ORACLE.**

| the claim | verdict |
|---|---|
| *"A's REPLY exports no screen bytes"* | ✅ **true** — the reply is two enums and two counts |
| *"so A does not let a caller read the session"* | 🔴 **false.** the needle is the caller's, so the reply measures a string the caller chose |
| *"B widens the blast radius from write to read"* | 🟡 **it widens the BANDWIDTH.** A already crosses write→read — that step is F03's subject, live the moment any read verb exists |

⇒ **the SAME-USER GATE makes the residual acceptable, not the reply's narrowness.** `case=F03`
carries that argument whole — *"the probe's blast radius is the same user — who can read the pty by
other means anyway"* — and it covers the oracle. A's conclusion rests on F03's gate, and the
narrowness of A's reply is a bandwidth reduction on top, not the guarantee itself.

🟡 **a bound is available and is NOT proposed here** (a blueprint call, not a vision one): reject a
probe whose needle is not the message this caller is about to say, or rate-limit probes per
connection. either shrinks the oracle; neither is free, and the first forecloses a probe used for any
purpose but a say.

## .rework, and why

**clean.** the response is additive — a `text` field can be added to the same reply later with no
caller changed, because a caller that ignores a field is unaffected. a removal would be the dirty
direction, which is the argument for the narrow start.

## .confidence 68%, and why it is low

two live uncertainties:

- the wisher wrote **content** deliberately, perhaps for a usecase not inferred here — an
  operator-faced *"here is what is in the box"* render. if so, A is a genie answer to the literal
  words of a request whose purpose was read too narrowly.
- A bounds **bandwidth**, not knowability, and the guarantee it rests on is F03's same-user gate, not
  its own reply shape. so B's marginal cost is smaller than the option table alone suggests — B is
  faster at a read A permits slowly, over a socket only the same user can reach. that is a real
  argument for B the classification-only choice does not by itself answer.

🟡 the classification remains the safe first step, and the rework stays clean in the additive
direction — which is why this is best-guessed rather than blocked on.

## 🔴 .this entry has NO SUBJECT under F05 = B — read the lever first

every option, cost, and demo above is about **what the probe replies**. under F05 = B (the
progress-extended transcript wait) there is no probe, so there is no reply, so there is no fork — the
narrow-read call is not a question anybody puts.

⚠️ **a narrow read of a reply that does not exist is not a call.** the collapse is stated here, in the
entry a council opens, rather than only in the inventory's lever table.

🟡 **it does NOT collapse under F07.** case=6 consumes one field of this reply (`focus: 'modal'`), so
an F07 = out verdict removes a consumer and leaves the fork whole — which parts this entry from F06,
the one both levers delete.

## .where

- `1.vision.yield.md`, `.the read channel`
- the invariant it protects — `define.invariant.clone-socket-brain-cli-only`
- `…case=F05….md` — the lever that deletes this entry's subject
- `…case=F03….md` — the same-user gate this entry's conclusion rests on

### 🔴 .the demos that RENDER this call

| demo | what it renders | marked unruled? |
|---|---|---|
| `case=2` t1 | the **reply, verbatim** — `{ phase: 'probed', focus, input, countInInput, countOnScreen }`, and the line that says those four fields are the WHOLE reply | ✅ yes, and it names **Q2 / F02** |
| `case=6` t1 | `focus` reads `modal` — one field of the same reply, consumed | ✅ yes |

⇒ `case=2` t1 is the only place in the vision where the reply appears as a literal; the other five
demos consume the classification without a literal render, so a verdict for the wider read edits one
demo, not seven. **that is the `.rework = clean` claim, measured.**

## .the verdict

unruled.
