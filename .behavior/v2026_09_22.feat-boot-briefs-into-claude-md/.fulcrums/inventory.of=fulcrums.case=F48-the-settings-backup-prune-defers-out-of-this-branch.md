# F48 — the settings-backup prune defers out of this branch

- **rework** = dirty
- **status** = OPEN — best-guessed, owed to the council
- **confidence** = 82%
- **where** = the brain-dir settings write path (`rhx init --hooks`, `rhx upgrade`); the dream
  `.dream/v2026_09_25.chore.init-and-upgrade-never-prune-settings-backups.md`

## .the fork, stated fairly

a human opened the default actor's brain dir mid-gate and found **11 `settings.*.bak.json` files**
across three days. every `rhx init --hooks` / `rhx upgrade` writes one (sometimes two — a bare
clock-stamped name and a pid-suffixed twin) and **never removes one**. it is a real, unbounded leak
in a write path **this branch already changes**.

| the fork | the case for it |
|---|---|
| **fix the prune now** | the `5.3.verification` stone's own mandate is literal: *"if you detect it, you fix it. no exceptions"* and *"zero omissions"*. the leak sits in a path this branch touches, so a reviewer may fairly read it as in-scope. and it is cheap in lines |
| **defer it — TAKEN** | the mandate governs gaps in **this branch's behavior coverage**. the prune is a prior product defect in a path this branch touches but whose behavior it does not change. the fix fails BOTH halves of the SAFE/CLEAN test, and the unsafe half is not theoretical |

## .taken, and why at the time

**deferred**, on the SAFE/CLEAN test (`rule.always.fix-forward-under-scouts-honor`):

- **safe — no.** the fix adds an *unlink* to a write path this branch already modified. an unlink
  that picks the wrong survivors destroys the only rollback a human has of their own settings. that
  is a destructive act added mid-gate to code already under review
- **clean — no.** it needs a new clamp plus a resnap of the acceptance tier this stone is about to
  verify as **byte-neutral**. so it would re-open the exact property the round's close rests on

⇒ a gap whose repair is destructive and whose clamp re-opens the gate's own evidence is the case
the SAFE/CLEAN test exists to catch. the alternative — a prune with a count-only clamp, landed fast
to satisfy the mandate — would be a clamp with no teeth (`rule.require.clamp-edge-cases`), which is
worse than the deferral.

## .rework, and why it is DIRTY

reversal is a teardown rather than an edit:

- the fix lands **inside** the settings writer, beside the temp-write + rename guard that
  `define.enrollment-identity-is-the-roleset-hash` documents as concurrency-critical
- it needs its own clamp, and that clamp asserts a **direction** (newest survive), so the test is
  not a line to delete
- a resnap of the acceptance tier rides with it, and those bytes are what this stone certifies

⇒ dirty, so the deferral owes this fulcrum **and** the dream, never the dream alone.

## .confidence, and why it is 82%

under the 93% floor, so it earns a row by `rule.always.itemize-the-fulcrums-you-best-guess`.

what holds it below: the stone's zero-omissions clause is **unusually absolute** — it says *"there
are no special cases"* and *"you do not get to say that was already broken."* read at its most
literal, it forbids this deferral outright. my read is that the clause governs **coverage of the
promised behavior** rather than every latent defect in every file the branch opens — otherwise the
gate could never close on any real codebase. but that is an interpretation of scope, and scope
interpretations are the wisher's to rule, never mine to settle alone.

## .the verdict once ruled

_(unruled — for the fulcrum council at the close)_
