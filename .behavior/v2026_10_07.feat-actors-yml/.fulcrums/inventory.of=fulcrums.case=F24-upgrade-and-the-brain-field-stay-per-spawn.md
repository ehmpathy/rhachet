# F24 — `rhx upgrade` leaves the manifest to `init`, and an actor's brain is read per spawn

- **fork** — two i004 reviewers ask that a recorded actor track its manifest sooner: `rhx upgrade`
  re-inits only linked roles, so a grown base's new role waits for the next prepare
  (enroll-impl-behavior-intent nitpick.5); and the sync sweeps compare roles only, so a `brain:`
  edit leaves `actor.json` as it was (enroll-impl-arch-defects nitpick.10). (a) teach both to read
  the manifest · (b) leave both, since the next reader of each fact reads it fresh
- **taken** — (b).
  - a base grows only when its package upgrades, and a package upgrade runs `pnpm install`, which
    runs `prepare:rhachet`, which runs `rhachet init` over the manifest. the window is the time
    between `rhx upgrade` and that install, with drift named in the next init's report
  - a slug actor's brain is never a derived artifact of its dir: `asActorFormEnrollment` reads
    `expanded.brain` from `actors.yml` at every spawn (F17), so a `brain:` edit takes effect at the
    next `rhx clone @x`. `actor.json` records roles because roles feed the boot and the hooks;
    the brain feeds neither
- **rework** — clean — a manifest read in `rhx upgrade`'s re-init; a brain field in the compare
- **confidence** — 70%; the `rhx upgrade` path is the weaker half, since it was not measured
- **where** — raised by enroll-impl-behavior-intent nitpick.5 and enroll-impl-arch-defects
  nitpick.10 (i004)
- **i005** — enroll-impl-behavior-intent blocker.1 refuted the upgrade premise: `rhx upgrade`
  installs with `lifecycleHooks: 'skip'`, so `prepare:rhachet` never runs. the window is real.
  so the boot sweep now collects a repo actor failure rather than throws (`syncBootsForBrainDirs`),
  and an actor-form enroll no longer needs the repo actor to expand (`getRepoAmbientForEnroll`).
  a grown base waits for the next `rhx init`, and every enroll still works meanwhile
- **verdict** — unruled; best guess taken
- **i006 amend** — the upgrade half is reversed on r10 blocker.2: `execUpgrade` now reads `actors.yml` and re-links the plan's role specifiers beside the linked roles, so a grown published base lands at `rhx upgrade` with no extra `rhx init` (`execUpgrade.test.ts` `[case1m]`). the brain half stands: read per spawn, never recorded
