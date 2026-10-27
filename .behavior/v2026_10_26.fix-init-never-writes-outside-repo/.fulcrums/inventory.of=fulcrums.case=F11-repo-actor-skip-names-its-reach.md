# F11 — a skipped repo actor names its reach, and no actor derives

## .the fork
with only the repo actor's dir outside the repo, init renders no boot for it, and so derives no
enrolled actor's settings (`invokeInit.ts`, the `!boots.repoActorRendered` return). two answers:
- A: derive the actors inside the repo anyway
- B: keep the early return, and have the warn name its full reach

## .taken
B. every actor's `settings.of.repo.json` derives from the repo actor's. with the repo actor's dir
outside the repo, that source is a file outside the repo, and its content is not the repo's to
trust. to derive from it reads outside the repo and spreads it into each actor. so the derivation
waits, and the warn's effect line says so: "the repo actor got no boot, so no actor got its role
hooks from this run". the hint names the fix.

## .rework
clean — option A is a change to the early return and to the source the derivation reads. no
contract moves.

## .confidence
85%. a human who links the repo actor out on purpose (dotfiles) may want the inside actors kept
current; that reads as a wisher call about trust of an outside source.

## .where
`src/domain.operations/actor/enrolled/asBrainDirOutsideRepoWarnLines.ts` ·
`blackbox/cli/init.hooks.outside-repo.acceptance.test.ts` case6, case7
