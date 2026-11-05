# self review — has-pruned-yagni — 5.1.execution.from_vision

each component of the diff, against the wish and vision.

## held — each was prescribed

| component | where | prescribed by |
|---|---|---|
| `SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS = 60_000` | `src/infra/socket/constants.ts` | wish outcome 1: "the peer-cred lookup timeout is 60s" |
| `getSocketPeerCred` reads the constant | `getSocketPeerCred.ts:73` | same; the literal `5000` was the defect |
| `CLONE_AUTH_GATE_TIMEOUT_MS = lookup + 5_000` | `clone/socket/constants.ts` | wish outcome 2: the gate bound sits above the lookup. a derivation, not a second literal, is the minimum that keeps the order; two literals are how #678 happened |
| `[case19]` clamp | `genCloneSocketServer.integration.test.ts` | wish done-means: a lookup in (5s, 60s) is accepted, red before, green after |
| `constants.test.ts`, two asserts | unit | the clamp proves 9s; it cannot cheaply prove the upper end (59s) or the order. two one-line asserts pin both. no fixture, no helper |

## held — not named, but the minimum to satisfy a prescribed item

- **`env: process.env` on the exec.** without it the clamp could not slow `ss`: jest's per-file
  `process.env` copy never reaches core child_process, and the first clamp run settled in 137ms
  against the real `ss`. in prod it equals node's default, so it changes no behavior. the
  alternative (inject an exec into `getSocketPeerCred`) would add a seam no caller needs. the
  one-line option is the smaller one
- **the clamp's four thens.** each checks a distinct claim: delivered, the gate waited (≥9s,
  which proves the fake was hit and the test is not vacuous), the bytes landed, no auth trace.
  the ≥9s then is the one that caught the 137ms vacuous pass; it is load-bearing
- **the `.note` on the 30s wedge floor** in the gate docblock. a fact a reader needs, since a
  lookup in (30s, 60s) now ends as a client wedge, not a deny. it is documentation, not code;
  the cure is deferred by the wisher (F3) and caught as a dream

## examined — the one item outside the wish

- **`.depcheckrc.yml` `ignore-patterns: [.claude]`.** not requested. `rhx git.repo.test --what
  lint` failed on this box: depcheck followed the `.claude` symlink into the actor brain dir's
  gitignored claude plugin cache and flagged a third-party test file. CI has no such cache, so
  CI would pass without it
  - kept under scouts-honor: it is SAFE (`.claude` holds no source this repo ships; the pattern
    cannot hide a real dep from `src/`) and CLEAN (one key, one file, no ripple). with no fix,
    every enrolled clone's local lint goes red for a reason unrelated to its change
  - it rides in this PR's diff and the PR description will name it, so a reviewer can split it
    out if preferred

## not added — and the omission is correct

- no execFile rewrite of the `ss | grep` pipeline (F7 measured: the exec timeout already settles
  the shell at the bound)
- no abort-on-hangup for the scan (F6, wisher: defer → dream)
- no change to the 30s client window (F3, wisher: defer → dream)
- no fault-reason split for lookup timeout vs real deny (dream caught)

no component found to prune.
