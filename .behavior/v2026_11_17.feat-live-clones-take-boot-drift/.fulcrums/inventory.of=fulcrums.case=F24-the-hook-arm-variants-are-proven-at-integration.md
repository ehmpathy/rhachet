# F24 · the hook arm's silent and speaks-again variants are proven at integration, not acceptance

## .the fork

- **a.** acceptance drives the hook arm on its loud path (a clone past the threshold, told twice);
  the silent arms (legacy, under the threshold, resumed, told) and the speaks-again arm are proven
  in `invokeClone.integration`, which runs the same contract entry over a real clone dir
- **b.** acceptance repeats each arm through the built binary, one stub clone per arm

## .taken = a

the arms differ only in what the clone record and the boot dir hold; the binary adds the argv parse
and the exit code, which the loud acceptance path already exercises, and the `--when` refusals sit in
acceptance too. each extra arm in acceptance costs a full spawn of the built cli for a branch the
integration case already pins over real files. the integration cases are: [case12][t1b]
(speaks again on a new drift), [case13b] (resumed, silent), and the legacy and under-threshold
cases beside them.

## .rework = clean

each arm is one `then` in `clone.boot.drift.acceptance` over a stub clone; no contract moves.

## .confidence = 70%, why

the reviewer asked twice; the doubt is whether acceptance parity is a standard this repo holds for
every arm, which no rule here states.

## .where

`blackbox/cli/clone.boot.drift.acceptance.test.ts`, `src/contract/cli/invokeClone.integration.test.ts`.
answers r10.nitpick.6 (level 3, i005).

## .verdict

owed — a council rules at the close.
