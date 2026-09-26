# F32 — keyrack source runs once per jest run

## .fork

`jest.<tier>.env.ts` sourced keyrack from `setupFilesAfterEnv`, which jest runs once per suite file.
each source cost about 25s on this box (a 2163-module import plus a child cli round trip).

| option | |
|---|---|
| a. keep it per suite | about 25s before the first test of every file |
| b. move it to `globalSetup` | once per run. in-band suites share the process env; forked workers inherit it |
| c. cache the keyrack output on disk | adds a file that holds secrets |

## .verdict — TAKEN, 85%, rework clean

(b). acceptance stays lenient and integration stays strict, as before. a one-file acceptance run
fell from 129s to 62s. dispatched upstream as `ehmpathy/declapract-typescript-ehmpathy#623`.

## .why the confidence is not higher

a strict failure now aborts the whole run at globalSetup rather than at each suite. that is louder,
and the message names the unlock command, but it is a change in where the failure lands.

## .rework

clean: two new files, two config lines, two removed calls.

## .where

- `jest.{acceptance,integration}.globalSetup.ts` · `jest.{acceptance,integration}.{config,env}.ts`
