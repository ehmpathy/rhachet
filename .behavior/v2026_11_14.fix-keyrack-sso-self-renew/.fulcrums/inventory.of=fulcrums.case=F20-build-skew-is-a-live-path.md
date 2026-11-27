# F20 — build skew is a live path

## .the fork

the vision's contract-gap note holds that "the cli and the daemon ship in one package, so skew is not a live path". the reviews at i005 (r010) and i006 (r011) showed two skews that do reach this daemon: it is long-lived (a held renew keeps it up, F5), and one daemon serves every repo on the host, each on its own pinned rhachet.

- **a** — take the vision at its word: `renewals` required on the wire, no keep branch, no `renewable` reply
- **b** — clamp both skews: `renewals` optional; an absent field keeps a prior same-mech renew (older cli → new daemon); the reply names what it filed and the cli warns with `rhx keyrack daemon prune` when it filed less (new cli → older daemon)

## .taken

b. under a, an older cli in a second repo that unlocks the same camp key either fails its unlock (field required) or silently ends the renew — the overnight dark the wish exists to end. and a new cli into a daemon spawned by an older build files a renew the daemon ignores, with no mark in status. both are a shipped harm on a two-repo host, so both were conceded urgent.

## .rework

clean: the payload field turns required, the keep branch in `handleUnlockCommand` and the `renewable` reply go, `getAllKeyrackRenewalsUnfiled` and `asKeyrackDaemonRenewSkewWarn` are deleted with their tests. no other caller depends on them.

## .confidence — 88%, why not higher

the vision's author stated the opposite on purpose, and a host with one repo never meets either skew. the call rests on a topology (two repos, two pins, one daemon) the wish does not name.

## .where

- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/handleUnlockCommand.ts`
- `src/domain.operations/keyrack/daemon/sdk/src/domain.operations/daemonAccessUnlock.ts`
- `src/domain.operations/keyrack/session/unlockKeyrackKeys.ts`
- `src/domain.operations/keyrack/session/getAllKeyrackRenewalsUnfiled.ts`
- `src/domain.operations/keyrack/cli/asKeyrackDaemonRenewSkewWarn.ts`

## .verdict

open — to the commander at the pr. the vision line stays as approved (F12).
