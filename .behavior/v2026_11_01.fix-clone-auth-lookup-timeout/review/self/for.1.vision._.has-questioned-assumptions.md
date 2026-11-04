# self review — 1.vision — has-questioned-assumptions

## issues found, and how each was fixed

1. 🔴 **assumed: the exec timeout bounds the lookup.** the whole vision rested on "the lookup is
   killed at its bound, so it ends at the lookup". but the command is a shell pipeline,
   `sh -c 'ss -xp | grep -E "…" || true'`. node's `timeout` signals the child it spawned — the
   `sh` — and `exec` settles on `close`, after every holder of the stdout pipe lets go. `grep`
   inherits that pipe and lives until `ss` ends. if that is how it plays out, the "kill" settles
   only when `ss` finishes, and an `ss` past 60s would end at the 65s gate first — the exact
   inversion the wish forbids. what if the opposite were true (the kill does settle at once)? then
   the plan stands as drawn. the issue's traces cannot part the two: an `ss` of 5–8s settles
   before the old 8s gate either way. fixed: the vision now states this as an unverified premise
   with the measurement owed at the start of execution, names the contingency (no shell —
   `execFile('ss', ['-xp'])`, inode filter in node, a larger `maxBuffer`), and records it as
   fulcrum F7 at 60%. no code may rest on it until measured.
2. **assumed: the clamp's before-run reads `deny`.** that follows from assumption 1. with a fake
   9s `ss` and the old code, the 8s gate may fire first and read `timeout`. fixed: the clamp now
   says "a non-pass — deny or timeout — the red run records which". either is red; neither is
   claimed in advance.

3. **the F7 premise leaked back in as fact, in five places.** a full re-read after item 1 found
   the old certainty still stated where the fix had not reached: "the 5s kill always fired first"
   (before narrative), "the lookup's kill fired first" (table), "the 5s kill used to reap it"
   (cons), "lookup exceeds 60s → killed, deny" (edgecases), and "kills the child" (groundwork).
   fixed: each now says only what the trace shows (the exec rejected as killed) or defers to F7.
4. **an invented figure.** "just 12× rarer" (awkward) — a ratio of two bounds passed off as a
   ratio of frequencies. no measurement backs it. fixed: cut to "past a far higher bar".
5. **a wrong bound.** the after block said the say's probes have a "5s reply each"; the observe
   probes use `CLONE_SAY_PROBE_REPLY_MS = 1_000` (`constants.ts:211`); only the baseline uses 5s.
   fixed.

lesson: a timeout on a shell pipeline is a claim about the shell, not about the work the shell
started. name which process the signal reaches before you rely on the bound.

## assumptions questioned, and why each holds

- **the issue's cause is the exec timeout, not `maxBuffer`.** the issue named both. `grep`
  filters the table inside the shell, so node's buffer sees only matched lines — a few hundred
  bytes against a 1MB default. holds. (if F7's contingency lands, node reads the whole table, and
  `maxBuffer` becomes real — the contingency names it.)
- **CI has `ss`.** the extant `genCloneSocketServer.integration.test.ts` dispatches real says
  through a real server, which runs the real gate and so the real `ss`; those tests pass in CI
  today. holds.
- **a fake `ss` on `PATH` is found.** `exec` runs `/bin/sh -c`, which resolves bare `ss` through
  the `PATH` it inherits from `process.env`. holds by the shell's contract; execution's first run
  confirms it (F5). if F7's contingency lands, `execFile('ss')` also resolves through `PATH`, so
  the clamp method survives either path.
- **the wisher said 60s; we inferred 65s.** stated as inferred (F1), never as asked.
- **"accepted" means the say lands.** inferred from "is accepted, not refused as auth-denied".
  the vision shows the true after-line, which on a slow box carries the extant `feed not live`
  degrade note — the say lands, the screen read is blind. a wisher who reads "accepted" as "a
  clean line" would see the note; flagged in the vision's after block.
- **same uid in every issue trace.** the issue states it (uid 1000, caller and clone). holds as
  evidence; the vision does not depend on more than that.
