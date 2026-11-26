# F7 — the keyrack TTL flake fixed here; three other load flakes in their own pr

## .the fork

the impacted integration tier failed four suites under a full parallel load, and each passed on a
rerun. the 5.3 review holds a flake to be a live defect. fix all four in this pr, fix none, or fix
the ones that are safe and clean to fix blind.

## .taken, and why at the time

the last option.

- `unlockKeyrackKeys` (`[case1]`, `[case3]`, `[case4]`, and the `ownerTtl` row): each read the
  clock only after the call and allowed 5s of slack; the call took 6–10s under load. `[case2]` in
  the same file already brackets the call (a clock read before and after). the repair copies that
  shape: test-only, one file, a proven pattern. so it rides along
- `keyrack daemon` `[case11]`, `getCloneSayObservation`, `getPnpmPresence`: each needs a diagnosis
  and a run under load to prove a fix, and none touches this diff. planned as their own pr,
  `fix(test): deflake the daemon, clone-say and pnpm probes under a full integration load`,
  gated on load runs that need the aws sso unlock (F9). the symptoms, read from the log by line,
  sit in `.dream/v2026_11_05.fix.integration-load-flakes-daemon-clonesay-pnpm.md` as that pr's brief

## .rework — clean

the keyrack edit reverts in one file. the other three are a separate pr either way.

## .confidence — 80%, and why it is low

the keyrack repair is proven only by ci: the paved test path unlocks aws sso before an integration
run, and that unlock was ruled out tonight (2026-11-05). the bracket is a copy of a row that
already passes, so a red is unlikely, but it was not run before the push.

## .where

`src/domain.operations/keyrack/session/unlockKeyrackKeys.integration.test.ts`

## .verdict

unruled.
