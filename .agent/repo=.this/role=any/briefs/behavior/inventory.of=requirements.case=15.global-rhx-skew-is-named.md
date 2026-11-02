# requirement: a global rhx that differs from the repo's pin is named

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

`rhx init` run by a rhx other than the one the repo pins prints a notice that names both: the rhx
that runs (path and version) and the pinned one. the notice never refuses the run (fulcrum F3, open
to the commander). a run by the pinned rhx prints no notice.

## .clamp

`getOneRhxProvenance` reads the active and the pinned rhx; `asRhxSkewNoticeOrNull` renders the
notice, or null; `invokeInit` prints it first.

## .proof

- `src/infra/getOneRhxProvenance.integration.test.ts` — the active rhx, a pin, no pin, a foreign
  manifest at the pin path
- `src/domain.operations/init/provenance/asRhxSkewNoticeOrNull.test.ts` — notice on skew, null on
  a match or no pin
- `src/contract/cli/invokeInit.integration.test.ts` — the notice on an init
- owed: a cited run at the done-gate head

## .source

vision case 7 of `.behavior/v2026_10_21.fix-init-refuses-ambient-claude-link`.
