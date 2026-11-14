# F28 — the repo-actor carry names the one settings file it copies, and lists no other entry

- **fork** — the 5.1 i006 arch-defects lane (r011 nitpick.4, conceded then) asked the carry step to
  name each entry of the former repo actor's brain dir it does not carry, as a report row. at 5.3 the
  question returned with the deferral rule. (a) list every uncarried entry · (b) name the carried
  file only, as now
- **taken** — (b).
  - the carry is a copy, never a move: the former actor dir stays whole and live, so no entry is
    lost or reverted — each stays with the actor that owned it, which a peer may still reach
  - the brain dir layout holds exactly one human-owned file, `settings.of.repo.json`. it is carried,
    and the report names it. `boot.md` re-renders; the arrows re-findsert; the grove is the box's
  - every other entry is claude's own state for that actor (`.claude.json`, `projects/`, the
    credential link) — by the sync invariant it derives from THAT actor's runs and must not cross
    to another actor
  - to tell an authored entry from runtime state, (a) needs a hand-kept list of claude's file names,
    which drifts with each claude release — the hand-upkeep defect `rule.forbid.workarounds` names.
    a report that lists runtime state on every `ambient:` change would bury the one row that matters
- **rework** — clean — one `readdirSync` of the former dir and a report row per name not in a list
- **confidence** — 75%; a human who hand-authors user-level claude config (`commands/`, `agents/`)
  in the repo actor's brain dir would keep it on the former actor after an `ambient:` change, unnamed
- **where** — `setRepoBrainDirSymlink.ts` `setRepoActorSettingsCarried`; proven by
  `setRepoBrainDirSymlink.integration.test.ts` (the `carries` cases)
- **verdict** — unruled
