# F8: the `genTempDir` swap rides in a test this change touches

- **the fork**: `genBrainCliConfigArtifact.integration.test.ts` built its temp repos from a hand-rolled
  `os.tmpdir()` path. this change adds [case8], [case9] and [case10] to that file. move its setup to
  `genTempDir` in this PR, or leave the hand-rolled path and split the swap out
- **taken**: swap it here
- **why**:
  - the new cases share `createTestRepo` with the extant ones; a second temp-dir idiom in one file
    for the new cases alone would be worse than either
  - `rule.forbid.adhoc-gentempdir-reimpl` and the repo's `code.test.accept.blackbox` brief name
    `genTempDir` as the one sanctioned form; the swap is a scouts-honor fix — safe (setup only, no
    assertion moved; peer review 5.3 r12 confirmed no lock weakened) and clean (one file, no ripple)
  - `rule.always.fix-forward-under-scouts-honor` asks for exactly this, and forbids its deferral
- **rework**: clean — revert the `createTestRepo` body to the prior temp path
- **confidence**: 90%
- **where**: `src/domain.operations/enroll/genBrainCliConfigArtifact.integration.test.ts`, `createTestRepo`
- **verdict**: —
