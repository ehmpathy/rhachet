# F26 — the `rhx run` short-flag collision is fixed in this pr

## .the fork

the 5.3 by-hand walk found `rhx rmsafe -r <dir>` refused: `invokeRun` declares `-r, --role` and
consumed the skill's own `-r`. fix it in this pr, or defer it to a pr of its own.

## .taken, and why

fix it here. the repair is local to `rhx run`'s argv read, and a deferral short of a massive
dirty refactor is forbidden (`rule.forbid.deferrals-short-of-a-dedicated-pr`).

- `asRunTargetFromArgs` reads run's own target flags from the raw argv: a short alias counts as
  run's own only before the skill or init name; the long `--repo` / `--role` count anywhere
- a short flag after the skill name passes to the skill untouched

## .rework

clean — `invokeRun.ts` and one pure transformer; no mods code depends on it.

## .confidence

92% — below 93% only because a caller that typed `rhx run --skill x -r <role>` (the short alias
after the name) now hands `-r` to the skill. the long form and the pre-name short form still filter.

## .where

- `src/contract/cli/asRunTargetFromArgs.ts` + `asRunTargetFromArgs.test.ts` (8 cases)
- `src/contract/cli/invokeRun.ts`, clamped by `invokeRun.integration.test.ts`
  (`run --skill deploy -r prep hands -r to the skill, never filters by role (F26)`) — red before
  the fix, green after

## .verdict

done in #702
