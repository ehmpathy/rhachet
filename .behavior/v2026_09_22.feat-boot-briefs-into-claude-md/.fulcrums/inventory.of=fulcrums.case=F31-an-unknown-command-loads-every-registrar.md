# F31 — an unknown command, or bare help, loads every registrar

## .fork

the cli now loads a command's registrar only when argv names it. commander still needs every
command registered to print `--help`, to suggest a typo fix, and to reject an unknown command.

| option | |
|---|---|
| a. load all registrars when argv names no known command | help and typo paths stay correct and slow |
| b. a static command manifest for help, registrars loaded never on help | fast help, but a second list that can drift from the registrars |

## .verdict — TAKEN, 90%, rework clean

(a). the slow path is only help and typos, which a human reads and a hook never runs. one table
stays the single source. the acceptance clamp asserts `--help` lists all 15 commands.

## .rework

clean: `getAllRegistrarLoadersForArgv` is the one seam.

## .where

- `src/contract/cli/invoke.ts` · `blackbox/cli/cli.thinImportPath.acceptance.test.ts`
