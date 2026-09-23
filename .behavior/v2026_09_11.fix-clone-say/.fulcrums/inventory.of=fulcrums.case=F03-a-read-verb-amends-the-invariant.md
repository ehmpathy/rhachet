# F03 — a read verb amends the socket's security invariant

**rework** clean · **status** OPEN · **confidence** 70% — the amendment grants a whole-screen read with a caller-chosen needle, and a security invariant is the wisher's to amend

## .the fork, stated fairly

`genCloneSocketServer.ts:26-27` states the premise the whole clone-socket design rests on:

> *"the ONLY action it lets a caller take is to place a gated message on the brain's input — never
> touch the wider terminal (the scoped-to-one-brain safety premise)"*

and `define.invariant.clone-socket-brain-cli-only` is its named invariant. a `probe` verb is a
**read**, so that sentence is no longer true as written.

| option | cost |
|---|---|
| **A** — amend the invariant: one write verb + one classified read verb, both same-user gated | a security invariant changes, and a robot changed it |
| **B** — put the read on a second socket with its own path + perms | two sockets to bind, reap, and lock down; two orphan paths; no new guarantee, since both answer the same user |
| **C** — no read channel; keep the write-only invariant intact | the wish cannot be fulfilled — every defect in it traces to the absent read |

## .taken, and why at the time

**A**, carried by the **same-user gate**:

- the socket is already `chmod 0o600` (`genCloneSocketServer.ts:329`) and already pays a per-connection
  same-user gate (`isCallerSameUser`), so the probe's blast radius is *the same user* — who can read
  the pty by other means anyway
- the reply carries **no screen bytes** (F02), so the read exports a classification, never content
- ⇒ the amended invariant is narrow and checkable, and the same-user gate carries the whole load

### 🔴 .the amendment ranges over the SCREEN, not merely the input state

the amendment a wisher approves at Q3 must be stated to the width the design has. the probe's reply
carries `countOnScreen`, and its needle is **the caller's** — so the read ranges over the whole
rendered screen, and a caller chooses what it measures there (`case=F02`, the oracle section).

| the amendment's real width | |
|---|---|
| `countOnScreen` ranges over **every rendered row**, not just the input state | so the read is whole-screen |
| the caller **supplies the needle**, so the reply is a function the caller evaluates | so the classification is not fixed |
| **never raw screen** — no screen bytes cross back | ✅ the one bound that holds |

⇒ 👍 **the amendment, stated to the width the design has:**

> *a caller may place a gated message, or ask a yes/no-grade question about the rendered screen —
> the focus, whether the input region is clear, and how many times a string THEY name appears. never
> a third act, and never raw screen bytes.*

🔴 **the guarantee that carries this entry is the same-user gate, not F02's narrowness.** F02's reply
is narrow, and its narrowness bounds **bandwidth** rather than knowability — so the load sits on the
`0o600` socket and its per-connection same-user gate, and that user can read the pty by other means
anyway.

🟡 **the option stands: B** is two sockets that answer the same user, **C** forfeits the wish. what a
wisher weighs is the **size** of the amendment: a whole-screen read, bounded only by the never-raw-bytes
line.

## .rework, and why

**clean.** the invariant is a brief plus its tests; a reversal deletes one verb and one doc section.
no caller is hardened against the read, because no caller exists yet.

## .confidence 70%

it is a **security** invariant, and this repo's own practice is that a nurture invariant is
overturned by the party who paid for it. the argument above is sound and it is still a robot's
argument about a guarantee a human wrote deliberately. the 30% is not doubt about the mechanism — it
is that this class of call is the wisher's to make even when the case is good, and the grant is a
**whole-screen** read with a caller-chosen needle, bounded only by the never-raw-bytes line. an
amendment stated to that real width is one a wisher is more likely to weigh differently.

## .where

- `src/domain.operations/clone/socket/genCloneSocketServer.ts:26-35` (the docblock premise)
- `.agent/repo=.this/role=any/briefs/define.invariant.clone-socket-brain-cli-only.md`
- 🔴 **F02 — a NARROW REPLY, never the mitigation.** F02 bounds the bandwidth of the read; the
  guarantee that bounds the **capability** is the same-user gate above

### 🔴 .the demos that RENDER this call — ALL SEVEN

every `1.vision.experience.case=N` file renders a probe, case=5's idle baseline included. so the demo
set does not merely *illustrate* option A — **it is built on it.**

⇒ that makes F03's blast radius the widest of any fulcrum here. a **C** verdict does not edit a line
in seven files; **it deletes the read channel.**

### 🔴 .what a C verdict deletes — IDENTICAL to F05 = B, so it is cited rather than copied

this pair has a property no other pair here has:

> **a `no` to F03 and a `no` to F05 yield the IDENTICAL outcome** — the transcript-only wish. so the
> collapse set is the same set, by construction rather than by coincidence.

⇒ therefore: **`case=F05`'s `.what a B verdict actually deletes` table is this entry's collapse set
too, verbatim and without exception** — the requirement rows (R2 · R4 · V1 · V2 · V3 · V4 · V5 · V6 ·
V7, plus **half** of R3 and **half** of V8), the demos (`case=2` · `case=4` · `case=6`), and the
dependent fulcrums (F02 · F04 · F06 · F08, with F07 mooted).

🟡 **the identity is what makes a pointer STRONGER than a copy here.** a copy decays when its owner
grows and it does not; an identity claim cannot go short — it stays true as `case=F05`'s table grows.
so this entry cites that table rather than duplicates it.

🟡 **so F03 and F05 are the SAME lever seen from two sides**, and the council should rule them
together: F05 asks *should `say` read the screen at all?*, F03 asks *may the socket carry that read?*
a **no** to either yields the identical outcome, so a **yes** to one buys naught without a yes to
the other.

⚠️ the demos are **not** individually marked `F03, unruled`, and that is deliberate rather than an
omission: a marker on every line of every demo is noise (`rule.forbid.emphasis-noise`), and the
claim it would carry — *"this whole vision presumes a read channel"* — is the vision's premise, not
a local shape choice. it is declared here, once.

## .the verdict

🔴 **RULED 2026-09-21 — the amendment is GRANTED, and it was granted WIDER than this entry asked for.**
the wisher settled F03 with F05, as this entry asked, and directed that the read reach the input
surfaces from the CLI (F15) rather than from `say` alone.

⇒ **so the invariant `define.invariant.clone-socket-brain-cli-only` is amended by the party who paid
for it** — which is the one route this repo holds open for a security invariant, and the reason this
entry was surfaced rather than best-guessed.

### 🟡 the amendment's BOUND is narrower than the grant

the grant names *"the input of the cli"*. it is not a licence to widen the socket to the viewport, and
the shipped read holds that line:

| what crosses | what does not |
|---|---|
| the two INPUT surfaces — the box, and the queue when `queued` | the turn output above the band |
| a classification, on every routine probe | box bytes, unless a caller opts in with `content` |
| the whole grid, under an explicit `--debug` | the grid on any read that did not ask for it |

⇒ the bound is CLAMPED, not merely stated: `[case9] [t0]` proves a default read carries no box bytes,
and `[t1]` proves the turn output above the band never crosses even when a caller opts in
(`genCloneSocketServer.integration.test.ts`). the opt-in clamp was mutation-proven — the gate reverted
to always-on, the clamp went red, the gate restored.
