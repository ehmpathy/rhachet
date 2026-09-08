# F14 — keep the raw socket trace line ahead of the framed report, rather than gate or restyle it

- **rework** = clean — one module's `ready.catch` plus one call site in `genCloneSpawn`
- **confidence** = 79%
- **status** = ⏳ open — taken at i076
- **where** = `src/domain.operations/clone/socket/genCloneSocketServer.ts`, the `ready.catch` block

## .the fork, stated fairly

on a bind fault, a human reads TWO differently-shaped outputs for ONE failure:

```
clone socket ready rejected with a bind fault: listen EACCES: permission denied __SOCKET__

💥 MalfunctionError: the reach socket is unavailable — its socket could not be bound
```

the first is a bare unframed diagnostic; the second is the rendered report. the r009
`behavior-friction-hazards` lane graded the pair a blocker and demanded the line be *"either
integrated into the framed report or removed, and the rendered screen snapped."*

three shapes were available:

| shape | what it costs |
|---|---|
| **A — keep it bare, make it visible** (taken) | the two-shape screen stays; a reviewer can now see it |
| **B — remove it** | ⛔ reinstates the failhide the r002 lane closed at i065 |
| **C — gate it on "did a caller take the rejection?"** | a new caller dependency, and two prior attempts measured red |

## .what was taken, and why AT THE TIME

**A.** the line stays; a readout and a snapshot were added so the screen is reviewable.

the decisive fact against **B** is measured rather than argued: this handler exists for the case
where **no caller awaits `ready`**, and with no caller there is no report. so removal means a real,
named, ANTICIPATED fault (EADDRINUSE, EACCES, the chmod fault, the bind bound) vanishes with zero
trace — which is precisely the condition `rule.forbid.failhide` names, and precisely what the r002
lane spent seven dark rounds to find.

**C** is the live one, and it is why this row is a fulcrum rather than a settled call. the module's
own docblock records two attempts, both measured 2026-09-05:

- a `get ready()` latch — flips on any plain read (a spread, an `Object.keys`, a debug log), so an
  innocuous line silently disarms a failhide guard (`rule.forbid.hidden-side-effects`)
- a hand-rolled thenable that latches on `then`/`catch` — leaked the rejection as UNHANDLED and
  reddened eight rows across `[case15]` and `[case16]`

⚠️ **a THIRD variant of C was not tried and is not refuted by those two:** an explicit boolean the
caller sets when it takes the rejection, read on a deferred tick. it detects the right act with no
hidden side effect and no re-implemented promise delivery. its cost is that the caller must
remember to mark — and a caller who forgets re-creates the silent loss, which is a failhide with a
longer fuse.

## .why the rework is clean

the change is local: the `ready.catch` body, plus one mark at `genCloneSpawn`'s await. no caller has
hardened against the trace line's presence, and no later work is built upon it. the acceptance
clamp added this round (`[case8]`'s trace snapshot) would go red on any of the three shapes, which
is what makes a reversal cheap to verify rather than merely cheap to write.

## ⚠️ .why the confidence is 79% rather than higher

**the visibility half is not in doubt** — the reviewer's decisive sentence was *"no acceptance
snapshot shows it… a reviewer cannot see the user's actual screen"*, and that is now closed by
measurement. what stays open is whether **A** is the right place to stop or merely the safe one.

the honest weakness: variant C-third was reasoned about, **never measured**, and F7's lesson on this
very inventory is that an unmeasured cost estimate *"manufactures the permission to defer."* this
row does the same at a smaller scale — it declines C on the strength of two adjacent attempts rather
than on a run of the variant actually proposed.

⇒ recorded as a weakness rather than papered over. the expiry condition, per F13's rule that a
deferral owes one stated as a command:

> **run `[case8]` with an explicit caller mark in `genCloneSpawn` and the trace gated behind it.
> green + the trace snapshot deleted ⇒ C is available and A is a choice; red ⇒ A is forced.**

## .the verdict

⏳ open. not escalated — `rule.always.defer-fulcrums-to-last` requires all three of no defensible
guess, a dirty rework, and every other question addressed. the first two both fail here.
