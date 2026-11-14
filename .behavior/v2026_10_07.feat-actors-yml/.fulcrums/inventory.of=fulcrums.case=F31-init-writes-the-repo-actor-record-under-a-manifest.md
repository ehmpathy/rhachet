# F31 — under a manifest, `init` writes the repo actor's `actor.json`

- **fork** — the 5.3 i003 `[case10]` acceptance run found that `init --hooks` under
  `.agent/actors.yml` wrote no role hook to the repo actor: the root pass leaves claude out under a
  manifest, and the per-actor pass reads only an actor dir that holds an `actor.json`, which a bare
  `init` never wrote. a fresh clone's `prepare:rhachet` left `@crew` hookless until its first enroll.
  (a) `init` findserts the repo actor's record · (b) the hook pass derives the repo actor with no
  record · (c) the root pass keeps claude, narrowed to the repo actor's roles
- **taken** — (a).
  - the record is the one input the per-actor pass already reads; with it, the repo actor derives
    by the same path every other actor does, narrowed to its own roles (`inventory.of=requirements.case=9`)
  - (b) adds a second derivation path for one actor; (c) re-opens the union leak the root-pass gate
    exists to close
  - the record holds `{ brain, roles }` from the `ambient:` actor — the same pair an enroll writes,
    so a later enroll converges on it rather than forks it
- **rework** — clean — one findsert in `setDeclaredActorsOndisk`, in a new file
  (`findsertRepoActorRecordOndisk`); a record already on disk is left alone
- **confidence** — 80%; `rhx actor list` now lists the repo actor before any enroll, which a human
  may read as a change
- **where** — `src/domain.operations/init/boots/findsertRepoActorRecordOndisk.ts`;
  `setDeclaredActorsOndisk.integration.test.ts` `[case3]`; `init.actors-yml.acceptance.test.ts`
  `[case10]`
- **verdict** — unruled
