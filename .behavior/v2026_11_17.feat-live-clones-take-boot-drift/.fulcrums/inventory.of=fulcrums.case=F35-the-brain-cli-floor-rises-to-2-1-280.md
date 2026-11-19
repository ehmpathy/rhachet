# F35 · the brain cli floor rises to 2.1.280

## .the fork

- **a.** raise the floor from 2.1.277 to 2.1.280, and move every test that pinned 2.1.277
- **b.** keep 2.1.277, and let an older cli spawn on the add-dir drift door untested

## .taken = a

- a live clone meets its drift only if `/compact` re-reads the `--add-dir` revision `CLAUDE.md`
- that read was measured on 2.1.280 by `rhx boot.compact.probe --door add-dir` (2026-11-18), exit 0
- no older cli was measured, so 2.1.277 would admit a cli whose drift path is unproven
- the floor's own docblock (`assertBrainCliVersionFloor.ts`) names the measure

## .rework = clean

probe 2.1.277 with the same skill; if it passes, lower the constant and resnap the three refusal frames.

## .confidence = 80%, why

the floor is set by the one version measured, not by a known break below it.

## .where

`src/domain.operations/enroll/assertBrainCliVersionFloor.ts` and the tests that pin the floor. answers
r12.blocker.7 (5.3, i002).

## .verdict

owed — flagged in the pr body; a council rules at the close.
