# F19 — the collect-or-throw shape stays per sweep in this change

- **fork** — four brain-dir sweeps each write the same catch: rethrow a code defect (`isCodeDefectError`), wrap a non-Error in a `MalfunctionError`, return a `BrainDirBootFailure` with its scope. (a) extract one shared transformer (`asFailureCollected` + a `genCollectedOrThrow` guard) in this change · (b) keep each sweep's catch, and pave the shared helper in its own change
- **taken** — (b). two of the four sweeps (`syncActiveActorBrainDirs`, `asRepoActorBrainDirOutcome`) predate this branch and carry their own hint and scope text; a shared helper must settle one policy for all four (which class a non-Error becomes, which hint reads), which changes refusal text that other suites snap. that ripples past the actors.yml diff, so it fails the CLEAN question. the shape is caught as a dream
- **rework** — dirty — four sweeps, their snapped refusal frames, and a policy choice across code this branch did not author
- **confidence** — 80%; a reviewer may prefer the extract now
- **where** — `setDeclaredActorsOndisk.ts`, `setDeltaActorsOndisk.ts`, `syncActiveActorBrainDirs.ts`, `asRepoActorBrainDirOutcome.ts`; raised by arch-opport-decomposition nitpick.2 (i002)
- **dedicated pr** — `ehmpathy/rhachet#746` (the dream it replaced is removed)
- **verdict** — unruled; best guess taken. 2026-11-14: no longer a dream — a planned dedicated pr,
  `ehmpathy/rhachet#746` (title + bounded diff: `appendix/dedicated-pr.actor-sweep-refactor.md`),
  shared with F21, per `rule.forbid.deferrals-short-of-a-dedicated-pr`
