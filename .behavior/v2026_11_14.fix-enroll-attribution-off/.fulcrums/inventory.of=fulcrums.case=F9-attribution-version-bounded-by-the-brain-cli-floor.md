# F9: the "which claude first honored attribution" question is bounded by the brain-cli floor

- **the fork**: the vision left a `[research]` question open: which claude version first honored
  `attribution`, for a host on an old claude. peer review 5.3 r1 (round 3) asks for the probe now.
  probe old versions one by one, or answer it from what enroll already enforces
- **taken**: answer it from the floor
- **why**:
  - enroll refuses any claude below `BRAIN_CLI_VERSION_FLOOR` = 2.1.277
    (`src/domain.operations/enroll/assertBrainCliVersionFloor.ts:16`). a host on an older claude gets
    no clone at all, so no clone there can carry the reminder
  - the real-brain clamp (`enroll.attribution.realbrain.acceptance.test.ts`, three cases) runs on the
    host's claude, which clears that floor (the harness refuses one that does not), and proves no
    reminder is emitted
  - `rhx claude.cli.probe` installs a version and prints it; it cannot run a clone turn, so a
    per-version probe would mean a real-brain run per installed version, for versions enroll refuses
- **residual**: a claude between 2.1.277 and the host's version is assumed to honor the key as the
  host's does; none was run
- **rework**: clean — add a real-brain run against the floor version if the commander wants it proven
- **confidence**: 85%
- **where**: `1.vision.yield.md` `.open questions & assumptions`, the `[research]` row
- **verdict**: —
