# F17 — the repo actor exid is read from actors.yml at each op, not once per run

- **fork** — under a manifest, which actor is the repo actor is a fact of `.agent/actors.yml`. (a) each op that needs it reads it (`getOneRepoActorExid({ repoPath })`) · (b) read once at the cli entry and thread the exid through every op of the run
- **taken** — (a). each op stays callable alone with only `repoPath`, which is how main's ops already take the repo actor (`getOneRepoActorOndiskDir`, `setRepoActorBrainDir`). the read is idempotent and cheap (one small yaml file). the hazard (b) closes is an edit to `actors.yml` mid-run, or two overlapped `rhx init`s — the same race every other file `init` reads already has, and one no op here claims to guard. (b) would add an `exid` input to ~10 ops and their tests, to close a race the rest of `init` leaves open
- **rework** — clean — the read moves to the entry and an input is added; no behavior change on a quiet repo
- **confidence** — 75%
- **where** — `getOneRepoActorExid` callers: `syncBootsForBrainDirs`, `setRepoActorBrainDir`, `getOneRepoActorOndiskDir`, `setDeltaActorsOndisk`, `setDeclaredActorsOndisk`, `syncActiveActorBrainDirs`, `genRepoActorGitignoreExclusion`, `findsertAgentEphemeralGitignore`, `genBrainCliConfigArtifact`, `invokeEnroll`; raised by arch-hazards-behavior nitpick.1
- **verdict** — unruled; best guess taken
