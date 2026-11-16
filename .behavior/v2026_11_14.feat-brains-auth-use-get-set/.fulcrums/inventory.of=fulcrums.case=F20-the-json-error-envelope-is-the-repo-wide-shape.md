# F20 — a `brains auth` json error rides the repo-wide `CliErrorJson` envelope, null keys and all

> raised in review 5.3 i001 (r006 blocker.2); for the council.

## .the fork

`brains auth use --output json` with no `--scope` prints the refusal through `withCliOutputErrors`,
which every `--output json` verb in the cli shares. its envelope `asCliErrorJson` has fixed keys:
`class`, `message`, `hint`, `reachState`, `reachCause`, `metadata`. a refusal with no reach fault
carries `reachState: null` and `reachCause: null`, and the hint shows both at the top and inside
`metadata`. the tree render of the same refusal prints only `{ hint, scopes }`.

options:

- A. keep the shared envelope (today). one shape for every json error the cli emits
- B. a `brains auth`-only error envelope that drops the null keys and the inner hint
- C. change `asCliErrorJson` itself, for every verb, to omit null keys and dedupe the hint

## .taken

A — a json consumer (the pool loop, a cron) parses one error shape across every verb, and branches
on a key it can count on: `reachState` is null by contract when no reach fault applies
(`asCliErrorJson.test.ts` [case1], [case8]). B forks that contract for one verb family. C is a
contract change to every `--output json` verb (`clone`, `keyrack`, `enroll`) and its consumers,
far past this PR. the tree and json renders differ by design: the tree is for a human, the json for
a machine that wants stable keys.

## .rework

clean — B is one projection in the three `brains auth` invokers; C is one edit to `asCliErrorJson`
plus every json error snapshot it moves.

## .confidence — 80%, why not higher

the duplicated `hint` (top level and `metadata`) is a real wart of the shared shape, not a choice
this PR made. whether C is worth its own PR is the council's call.

## .where

`src/contract/cli/asCliErrorJson.ts` · `src/contract/cli/withCliOutputErrors.ts` ·
`blackbox/cli/__snapshots__/brains.auth.acceptance.test.ts.snap` ([case3] json)

## .verdict

open — for the council.
