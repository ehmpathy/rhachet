# F2 — the token source is the enroller's env only

## .the fork

where does enroll find the long-lived token: (a) `CLAUDE_CODE_OAUTH_TOKEN` in the enroller's env, which `asBrainCliSpawnEnv` already passes through; (b) a rhachet-owned host store (a 0600 file, or a keyrack key) that enroll injects; (c) both.

## .taken, and why at the time

(a). it needs no new store and no new secret surface, and it already reaches every clone today — the spawn env is the caller's env minus the parent-session markers. a keyrack key would expire with its unlock (~9h), which defeats a one-year token; a bespoke file is a new secret store to own.

## .rework

clean — a store in (b) is additive: enroll would read it only when the env lacks the variable.

## .confidence, and why it is low

80%. headless grove crews spawn from tmux and cron, whose env may not carry a shell-profile export. if the grove spawner cannot set it, (b) earns its place — and that spawner lives in another repo (`git.grove.auth`).

## .where

`1.vision.yield.md` › the contract; case 2.
