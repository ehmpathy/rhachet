# F8 — the raw `claude` depth reset (F7) is split: the strip lands here, the supplier write is a planned pr

**the fork:** F7 was ruled: a raw `claude` in a pane that inherited `RHACHET_CLONE_DEPTH=1` resets
to 0 via `env` in the repo brain dir's settings. execution measured both of F7's premises before
it relied on them, and one failed:

- **premise (2) was false as built.** `genBrainCliConfigArtifact` builds each enrolled clone's
  `--settings` file from the repo's `.claude/settings.json`, and `getSettingsForRoles` keeps every
  non-hook key by spread. so an `env.RHACHET_CLONE_DEPTH = "0"` in the repo settings would ride into
  every enrolled clone's settings, reset a depth-1 reviewer's tool shell to 0, and re-open the exact
  defect the wish names. that path was live already: any repo settings that carried the key reset
  every enrolled clone
- **the writer is not rhachet's.** the repo settings file is written by the brain supplier's hooks
  adapter (`genBrainHooksAdapterForClaudeCode`, shipped by `rhachet-brains-anthropic`)
- premise (1), whether a settings `env` overrides an inherited var (Q11), is owed by the pr that
  writes the key

options: (a) land all of F7 here, which includes a supplier release · (b) defer all of F7 and name a
manual cure · (c) split: land the strip in rhachet now, which closes the live hole and makes premise
(2) true, then land the supplier write as a planned dedicated pr · (d) drop the edge.

**taken:** (c). the strip is rhachet code: `asSettingsWithoutCloneEnv` drops every
`RHACHET_CLONE_*` key before the artifact is written, and it is clamped by a unit case list plus
`genBrainCliConfigArtifact.integration.test.ts` [case7]. the supplier write is a planned pr, with a
title and a bounded diff, in `.dream/v2026_10_19.feat.raw-claude-inherited-depth-reset.md`.
(a) blocks this pr on a second package's release. (b) leaves the live hole open. (d) contradicts
the wisher's S1.

**rework:** clean. the call is reversible: the strip is one transformer on one write path, and the
supplier pr adds a key with no rhachet caller to migrate. the deferred work sits across a package
boundary, which is why it is its own pr, and that does not make the rework dirty.

**confidence:** 85%. the wisher ruled F7 itself, so its split is flagged here for the council. the
cell still uncured until the supplier pr lands is case 7 [t3]–[t4], an inherited pane where a human
runs a raw `claude`. the refusal hint names no manual cure for it: it tells a reviewer clone not
to retry, a human in a shell a clone opened to run `rhx enroll` from a fresh terminal (the hint
moved with F13), and a driver clone enrolled with no tty to ask its human to re-enroll it from a
fresh terminal. it never names the depth var, nor tmux (a pane takes the server env, so it is the
F13 bypass), since an absent var reads
as depth 0 and "clear the var" was a bypass recipe (removed at r011 i005 blocker.1). until the
supplier pr lands, that cell has no cure.

**where:** `asSettingsWithoutCloneEnv.ts` · `genBrainCliConfigArtifact.ts` ·
`assertCloneSpawnDepthWithinLimit.ts` (the hint) · the planned pr in the dream above.

**touched by #600:** yes — #600 (`d91e8270`) rewrote `genBrainCliConfigArtifact.ts`,
`getSettingsForRoles.ts` and the artifact's integration test, and added
`getAllBrainCliSettingsLayers`. the premise-(2) evidence and the strip's seam both sit there.
**re-verified on the rebased tree:** premise (2) still holds under the new layout. the source is
now the repo actor's `settings.of.repo.json`, and every actor's `settings.of.repo.json` (the file a
clone reads at the `--settings` rank) derives from it, so an `env` key there would still reach
every clone. the strip moved into #600's locked write (`setActorSettingsRepoWithinLock`), after
the narrow, for every actor, the repo actor included. its clamp is now
`genBrainCliConfigArtifact.integration.test.ts` [case7] (#600 took [case6] for its mutex case),
green in the rebased integration run. the grove (`~/.claude/settings.json`, the user layer) is the
human's own file and stays out of scope, as before.

**the repo actor is stripped too, which reverses the i005 r010 plan.** before the rebase, the plan
was to strip only an enrolled actor's file and leave the repo actor's, as the home of the
supplier's reset. #600 makes that wrong both ways:
- a bare `rhx enroll claude -p` (a guard's reviewer) is a clone of the repo actor and reads its
  `settings.of.repo.json` at `--settings`, so a reset key there resets that reviewer to depth 0
- a raw `claude` reads `<repo>/.claude/settings.json`, which is the grove arrow, and never reads
  `settings.of.repo.json`, so a reset there would not reach the raw session it was for

so the strip covers every actor, and the supplier pr's write path is re-opened: under #600 the only
file a raw `claude` reads and a clone does not is the grove, the human's own. the dream records that
the pr asks the wisher before it writes there.

**verdict:** —
