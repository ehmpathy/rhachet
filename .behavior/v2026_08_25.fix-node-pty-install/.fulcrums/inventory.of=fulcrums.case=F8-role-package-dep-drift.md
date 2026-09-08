# F8 — the role-package dep drift rides this diff

- **rework**     = clean
- **confidence** = 91%
- **status**     = ⏳ open — deferred to the rebase, at i046
- **where**      = `package.json`, `pnpm-lock.yaml`, `.claude/settings.json`, and the snapshot
  churn they cause (`36 → 45 brief(s)`, `16 → 18 brief(s)`, across 8 snapshots)

## .the fork, stated fairly

this branch carries four role-package bumps that have **no relation to node-pty on linux**:

| package | trunk | this branch |
|---|---|---|
| `rhachet-roles-bhrain` | `0.32.1` | `0.33.0` |
| `rhachet-roles-bhuild` | `0.21.35` | `0.21.36` |
| `rhachet-roles-ehmpathy` | `1.38.7` | `1.38.12` |
| `rhachet-roles-ghlitch` | `0.2.11` | `0.3.0` |

they are not inert. two artifacts follow from them mechanically:

1. **`.claude/settings.json`** gains `pretooluse.forbid-cross-repo-access` and loses the `dreamer`
   boot hook — both are role-owned, re-stamped by `rhachet init` against whichever version is
   installed
2. **eight snapshots move** — `36 → 45 brief(s)` and `16 → 18 brief(s)` — because the newer role
   package ships more briefs for `rhx init +architect` to link

so the fork is: **revert to trunk now, or let the drift ride?**

## 🚨 .the precedent is not mine — trunk already ruled on this exact drift

`6f4128d` (#485, on `origin/main`) hit the identical case and stated the rule in its own message:

> *"the rebase resolved package.json as a union, which kept locally-bumped
> rhachet-roles-ehmpathy 1.38.12 and ghlitch 0.2.12 where trunk holds 1.38.7 and 0.2.11. the newer
> role package ships 9 more briefs, so it moved an init.incremental snapshot (36 -> 45 briefs) that
> has no relation to keyrack"*

and its remedy:

> *"reverted both to trunk, so package.json and .claude/settings.json are now byte-identical to
> origin/main and the pr carries **zero dep drift**. the role bump belongs in its own line, never
> riding a bugfix"*

> *"the removed pretooluse.forbid-cross-repo-access hook ships WITH ehmpathy 1.38.12 and is absent
> from 1.38.7"*

⇒ **every symptom matches, down to the hook name and the `36 → 45` figure.** this is the same drift,
on the same files, from the same cause. so the question is not *whether* to revert — trunk has
answered that — but **when**.

## .what was taken, and why, at the time

**taken: revert it, at the rebase rather than now.** two reasons, and the second is the load-bearer:

1. **the rebase is owed regardless.** this branch sits at `6840c69` (v1.47.2); trunk is at `c512891`
   (v1.47.3), two commits ahead. `package.json` will conflict there, and #485's message names the
   union merge as the very mechanism that introduced the drift. so the rebase is both the moment the
   conflict surfaces **and** the moment the hazard repeats — to settle it deliberately there closes
   both
2. 🔴 **a downgrade right now would disturb the tooling this drive runs on.** `bhuild` and `bhrain`
   own `route.drive`, `route.stone.set`, and the stone guards. to move them mid-drive risks a guard
   that no longer reads this route's files, for zero gain — the revert lands identically at the
   rebase, when the drive is done

## .the merge rule, written down so the union hazard does not repeat

at the rebase, `package.json` is settled **by hand, field by field**, never as a union:

| field | take |
|---|---|
| `optionalDependencies.node-pty` | 🟢 **ours** — `1.2.0-beta.15`. this IS the cure |
| `pnpm.onlyBuiltDependencies` | 🟢 **ours** — the `node-pty` entry stays deleted. this is the proof no manual step is required |
| `rhachet-roles-*` (all four) | 🔵 **trunk's** — the drift this entry exists to retire |
| `version` | 🔵 **trunk's** — release-please owns it |

then `pnpm install`, then `rhachet init` to re-stamp `.claude/settings.json` against the reverted
versions, then a resnap — which should return the eight brief-count rows to trunk's figures on its
own.

## .why the rework is clean

it ripples to no source and no test logic. it is a manifest revert plus a regenerated stamp plus a
resnap, and every affected snapshot row is a **count** rather than a behavior. naught in the
node-pty cure, the frame extraction, or their clamps reads a role-package version.

## .why the confidence is 91% rather than higher

the 9% is **not** doubt about the revert — trunk's precedent is explicit and cited. it is doubt about
the *deferral*: a reviewer may reasonably hold that a diff should never be **submitted** with known
drift in it, even with the revert scheduled. that reading is defensible, and the counter is only
that the rebase is unavoidable and imminent.

⚠️ **if the wisher prefers it reverted before the arrival, that is a clean instruction to take** —
the cost is one `pnpm install`, one `rhachet init`, and one acceptance resnap.

## .the verdict

⏳ open. to be closed at the rebase, by the merge rule above.
