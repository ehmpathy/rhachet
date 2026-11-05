# F9 — `getSocketPeerCred` keeps `process.env` and its three i/o leaves inline

## .the fork

a peer reviewer (i003, arch-opport-decomposition) proposed two further cuts of `getSocketPeerCred`:

- **A** — inject `env` through `context`, so a test scopes its own PATH rather than set
  `process.env.PATH` for the worker (nitpick.2)
- **B** — lift the readlink (inode), the signed-inode + grep-pattern compute, and the `/proc/<pid>`
  stat into named leaves, as the pid parse was lifted (nitpick.4)

or keep both as they are, and leave this PR at the bound, the gate, and the peer-pid read.

## .taken

keep both inline.

- **A**: the clamp that needs the slow `ss` most is `genCloneSocketServer [case19]`, which drives the
  real server. that server calls `isCallerSameUser` → `getSocketPeerCred({ socket })` with no context,
  so the swap must reach `process.env` there no matter what. a `context.env` seam would serve only
  `getSocketPeerCred [case2]`, while the global swap and its guards stay for case19. two seams for
  one fixture is more to keep, not less
- **B**: the readlink and stat lines predate this PR, and the change does not touch them beyond a
  named fault on the stat. a three-leaf split is a refactor of a module this PR only bounds — the
  scope rule (`rule.prefer.scouts-honor`: no refactor smuggled into an unrelated change) holds it out

## .rework

clean. both are local to one file plus its test; no caller signature changes (`context.env` would be
optional). either can land in its own PR.

## .confidence

85% — B is plainly out of scope. A is a judgment: a reviewer could weigh the second seam as worth it.

## .where

- `src/infra/socket/getSocketPeerCred.ts`
- `src/.test/assets/genFakeSsOnPath.ts`, `src/.test/assets/genSceneWithFakeSsOnPath.ts`
