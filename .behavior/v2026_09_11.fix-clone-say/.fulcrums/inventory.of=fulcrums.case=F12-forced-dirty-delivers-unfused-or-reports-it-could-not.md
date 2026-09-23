# fulcrum F12 — forced-dirty delivers unfused or reports it could not, over the append-and-`released`

**arose:** 5.1.execution.from_vision, r007 (arch-hazards-behavior) nitpick.2 + r009 (ergo-friction-hazards) blocker.1
**rework:** dirty · **status:** OPEN · **confidence:** 55%

## the fork, stated fairly

a `--force` dispatch into a dirty input region APPENDS: it lands `<fragment><message>` as one turn,
`getCloneSubmittedCount` counts the needle within the fused turn, the transcript rises, and `say`
reports `released`/`landed`, exit 0 — a false success over the human's destroyed in-flight words.
this feature's root is a false FAILURE; forced-dirty adds a false SUCCESS.

- **option A (shipped):** forced-dirty PROCEEDS (F06: dirty is forceable) and reports the rise. the
  interim mitigation is the `--force` help text, now `DESTRUCTIVE:`-led and it states the fusion (r009
  blocker.1 REPAIR).
- **option B (the reviewer's):** either DELIVER unfused (clear the human's region first), or REPORT
  that it could not — e.g. throw *"forced dispatch would fuse — not supported yet"* until Q22.

## what was taken, and why

**A shipped with the destructive-cost mitigation; B deferred to the wisher — not unilaterally
adopted.** option B's two halves each hit a wall:

1. **"deliver unfused"** needs the server to CLEAR a multi-row dirty region before it writes — whether
   a multi-row region CAN be cleared is **Q22** (unrun vision measurement; *"forced-dirty currently
   APPENDS"*). a clear built on a guess risks the destruction of MORE of the human's work.
2. **"report it fused"** needs `say` to tell `<fragment><message>` from `<message>` — which needs the
   human's fragment CONTENT, and the socket returns a classification, never bytes (F02/F03,
   `define.invariant.clone-socket-brain-cli-only`). so a fusion-detector cannot be built without a
   widen of the socket into the session oracle the invariant bars.
3. **"throw not-supported until Q22"** REVERSES decided invariant **F06** (dirty is forceable) — a
   settled call, so a refuse-branch is the wisher's, not a driver's unilateral edit.

## rework, and why dirty

a clear-and-rewrite of a multi-row region (Q22-gated) is a new server capability; a refuse-branch
reverses F06; a fusion report is barred outright by F02/F03. none is a local, safe edit.

## confidence, and why low (55%)

the mitigation (help states the cost) is high-confidence and shipped; the 55% is on which of B's
three sub-options the wisher wants (clear / refuse / accept-with-warned-cost), each of which touches
a decided invariant or an unrun measurement.

## where

`invokeCloneSay.ts:65-68` (the `--force` option + its now-`DESTRUCTIVE` help) ·
`computeCloneDispatchPrecheck.ts` (the dirty-and-forced proceed branch) · `sayClone.ts` (the force
frame) · gated on Q22 + a wisher verdict on F06 + the F02/F03 content invariant.

## the verdict, once ruled

_(unruled — awaits Q22 (multi-row clear) and a wisher call on whether to reverse F06)_
