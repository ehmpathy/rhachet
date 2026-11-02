# F3 — the sdk path takes a mocked repl, not the mock cli

## .the fork

- (a) one mock `claude` serves the tui, `-p`, and the agent sdk path
- (b) the mock cli serves the tui and `-p`; the sdk pipe suites take a mocked `BrainRepl` at the
  rhachet seam (`genMockedBrainRepl` already exists)
- (c) `rhachet-brains-anthropic` exposes the sdk's executable option, so (a) becomes possible

## .taken

(b). (a) is not possible today: `rhachet-brains-anthropic@0.4.3` calls the sdk `query()` with no
`pathToClaudeCodeExecutable` and no `env` (`dist/domain.operations/repls/genBrainRepl.js:182-194`),
so the sdk spawns its own bundled cli and never sees the `claude` on PATH. the sdk suites assert
only that a call goes through and a value comes back, which a mocked repl proves. the one sdk
smoketest stays real.

## .rework

clean — each sdk suite swaps one `genBrainRepl` call for a mocked repl; a later move to (c) swaps
it back to the supplier with an executable option.

## .confidence — 80%

(c) would keep the supplier package in the loop for each suite. the wisher may prefer it, at the
cost of a change in another repo.

## .where

`1.vision.yield.md` — `### after`, Q2

## .verdict

ruled 2026-11-02 by the director: taken as best-guessed. the mocked repl lives inside rhachet. an exec-path change to `rhachet-brains-anthropic` is a later dispatch, out of this route (seed S2).
