# F3 — where a package's published actors live

- **fork** — an `actors:` list in `rhachet.repo.yml` (emitted by `repo introspect`), vs a separate shipped `actors.yml`, vs a field on the `getRoleRegistry()` export only
- **taken** — `rhachet.repo.yml`: it is already the one file consumers read to discover a package's roles (`getRoleRegistriesByConfigImplicit.ts:17-51`), and its zod schema strips unknown keys, so older rhachet ignores it safely
- **rework** — clean: introspect emits, one reader parses
- **confidence** — 80%; the source of the declaration inside a package (a yml vs a `RoleRegistry.actors` field) is left to the blueprint
- **where** — `1.vision.yield.md` contract row "where a published actor lives", case=3
- **verdict** — unruled
