# define: cross-username recovery — unlock vs set

## .what

keyrack handles the "wrong user signed into the browser" case differently for
`unlock` vs `set`, because the two operations have opposite relationships to the
expected user.

| operation | relationship to expected user | recovery strategy |
|-----------|-------------------------------|-------------------|
| `unlock`  | has a STORED expected user (`meta.awsSsoUsername`) | detect mismatch AFTER login → logout + retry → recover to the stored user |
| `set`     | DEFINES the expected user (captures whoever authenticates) | pre-clear any prior session BEFORE auth → adopt whoever logs in fresh |

## .why they differ

`set` has no user to recover *to* — it is the operation that decides the expected
user. so it cannot "reconcile against" a stored value; there isn't one yet. it
instead clears prior sessions up front so the browser prompts fresh, then records
whoever the human authenticates as.

`unlock` already knows the expected user (persisted at `set` time). so it can
detect a mismatch and actively drive recovery back to that user via
`logoutAwsSsoSession` + re-login.

## .the unlock recovery output (vision)

when unlock detects a cross-username state, the CLI renders TWO blocks — mirroring
the composite `set` output (progress logs, then results summary):

```
🔓 keyrack unlock testorg.test.AWS_PROFILE      <- per-key progress: "logs to get there"
   ├─ with sso prior?
   │  ├─ ✗ session user mismatch
   │  │  ├─ expected: alice@acme.com
   │  │  └─ observed: bob@acme.com
   │  └─ ✓ cleared, re-auth triggered
   ├─ ⚠ wrong user, logout browser session...
   │  ├─ expected: alice@acme.com
   │  └─ observed: bob@acme.com
   ├─ ✓ logged out, retry login...
   └─ ✓ authenticated as alice@acme.com
                                                 <- blank separator
🔓 keyrack unlock                               <- final results summary
   └─ testorg.test.AWS_PROFILE
      ├─ env: test
      ├─ org: testorg
      ├─ vault: aws.config
      └─ expires in: 540m
```

## .why two blocks + the silent-mode trap

the CLI unlocks each key with `silent: true` because it prints its own
`🔓 keyrack unlock` results summary AFTER all keys are processed. that summary is
"the final results". the recovery logs are "the logs taken to get there".

the routine reuse path (valid session, correct user) stays silent — it has no
logs worth showing; the results summary suffices. but the recovery path must NOT
stay silent — otherwise the CLI emits orphaned recovery fragments before the
summary, with no header to attribute them to a key.

rules for `vaultAdapterAwsConfig.unlock`:
- the recovery path prints a per-key progress header `🔓 keyrack unlock <slug>`
  before its tree, then a trailing blank line — regardless of `silent`. this
  attributes the "logs to get there" to a key and separates them from the results
  summary. mirrors how the guided `set` mechanism prints `🔐 keyrack set AWS_PROFILE`
  before its wizard logs.
- the reuse path prints the same header only when NOT silent (CLI never shows it,
  since CLI unlocks silent; verbose callers and unit tests do).

## .the set pre-clear tree

`set` (guided setup) pre-clears before auth:

```
   ├─ with sso prior?
   │  ├─ ✗ https://.../start, expires ...
   │  └─ ✓ cleared, to prevent collisions
```

## .coverage

- unlock recovery: `keyrack.vault.awsIamSso.acceptance.test.ts`
  - `[case15]` mode 2 (valid session, wrong user, single retry)
  - `[case18]` mode 1 (invalid session after login, recovers)
  - `[case19]` mode 2 deep (wrong user persists once, second retry recovers)
- set pre-clear: `[case16]` (no prior), `[case17]` (wrong user cached)

## .see also

- `lesson.aws-sso-logout-clears-browser-session` — the domain-scoped logout mechanism
- `lesson.aws-sso-browser-session-reuse` — why the browser auto-completes
