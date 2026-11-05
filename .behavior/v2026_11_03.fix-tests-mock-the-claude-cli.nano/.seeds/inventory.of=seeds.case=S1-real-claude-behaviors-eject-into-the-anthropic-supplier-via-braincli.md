# S1 — real claude behaviors eject into the anthropic supplier, via BrainCli

## .said

> these behaviors should probably be ejected into rhachet-brains-anthropic, via the BrainCli interface, anyway right?
>
> lets dispatch the task to formalize the BrainCli interface in rhachet and the subsequent task to prove the behavior via the Cli in rhachet-brains-anthropic
>
> then this repo doesnt have to pay to test those
>
> nor needs to retest against the claude brain everytime there's unrelated rhachet changes

(pr #691 review, 2026-11-04, on the realbrain seam table of the prior route's vision)

## .settled

- the real-tui behaviors the `clone.*.realbrain` suites pin belong to the anthropic supplier, not to rhachet
- two tasks, in order: (1) rhachet formalizes a `BrainCli` interface; (2) rhachet-brains-anthropic proves the real claude cli behaviors through it
- once both land, rhachet's own suites stop to spend api credit on those behaviors, and stop to retest a real claude on unrelated rhachet changes
- it extends F2 (suppliers own their real contract tests) from the sdk suites to the cli seams

## .landed

| what | where |
|---|---|
| radio task: formalize BrainCli | `ehmpathy/rhachet` (held while the global radio.uses block holds) |
| radio task: prove claude cli behaviors via BrainCli | `ehmpathy/rhachet-brains-anthropic` (held while the global radio.uses block holds) |
| F2 verdict | `.fulcrums/inventory.of=fulcrums.case=F2-suppliers-own-their-real-contract-tests.md` |
