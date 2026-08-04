# howto: test local rhachet changes

> "if you havin node problems i feel bad for you son, i got 99 problems but npm aint one" — use pnpm

## .the one gotcha that wastes hours

this repo's own package is named `rhachet`. so to exercise YOUR local changes you must
invoke a binary that resolves to THIS worktree — not the published `rhachet` on npm, not a
globally-installed `rhx`. there are three `rhx`/`rhachet` on a dev box, and only one runs
your code:

| you type | resolves to | runs your local changes? |
|----------|-------------|--------------------------|
| `rhx` (bare, on PATH) | `~/.local/share/pnpm/rhx` — the **global** install | ❌ no — a published version |
| `npx rhx` / `./node_modules/.bin/rhx` | `node_modules/.bin/rhx` → `node_modules/rhachet/bin/run` | ✅ **only if `node_modules/rhachet` is a `link:.` to this worktree** |
| `npx tsx ./bin/run` | this worktree's `bin/run` directly | ✅ always (bypasses node_modules) |

- use **plain `rhx`** for role/route skills (`rhx route.stone.set`, `rhx git.repo.test`) —
  the global install carries the roles and is fine for those.
- use **`npx rhx`** to test a change to THIS repo's own CLI (e.g. `rhx keyrack …`) — it
  routes to `node_modules/.bin`, which is the live worktree **only when the self-link holds**.

## .the self-referential `link:.` — purpose + hazard

`node_modules/.bin/rhx` is a symlink to `node_modules/rhachet/bin/run`. what
`node_modules/rhachet` IS decides the whole outcome:

- **`link:.` (the committed, intended state)** — pnpm symlinks `node_modules/rhachet` → the
  worktree root, so `bin/run` → `bin/run.jit` → `require('../dist/...')` loads **your**
  freshly-built dist. this is what makes `npx rhx keyrack` exercise your local change, and what
  makes `prepare:rhachet` (`rhachet init`) + `upgrade:rhachet` (`rhachet upgrade`) run the local
  CLI. `link:.` is the value the tracked package.json MUST carry.
- **a version pin like `"rhachet": "1.44.4"` (package.json line ~166) — the accidental-defect
  revert** — pnpm installs the **published tarball** into `node_modules/rhachet`, so `npx rhx`
  silently runs the shipped version. your `src` edits are invisible, and **`npm run build` has
  no effect** on what `rhx` runs, because `rhx` never reaches this worktree's dist. if you find
  the self-dep pinned to a version, that is a defect — a release/version bump reverted `link:.`;
  restore it (below).

**the hazard: it fails SILENTLY, and the test suite hides it.** a `pnpm install`, a dependency
bump, or a lockfile change can drop `link:.` back to the version pin. then:

- `npx rhx keyrack set --vault aws.params` → `invalid --vault` (the published binary has no
  aws.params), even though your `src` + a fresh `npm run build` both have it.
- **yet `rhx git.repo.test --what acceptance` still passes** — the blackbox harness invokes
  `../../../bin/run` (this worktree) *directly* (`invokeRhachetCliBinary`), never
  `node_modules/.bin/rhx`, so it exercises the live code regardless of the self-link. the
  divergence between "tests green" and "the binary a human runs is stale" is exactly what
  makes this cost hours.

## .detect it

```bash
readlink node_modules/rhachet    # link:. → a symlink to the repo root; pinned → a real dir
npm ls rhachet                   # link:. → "rhachet@… -> ./"; pinned → "rhachet@1.44.4"
```

or the fast empirical check: `npx rhx keyrack set --help | grep aws.params` — absent means
you are on a stale/published binary.

## .restore the committed `link:.` (yes, commit it)

if the self-dep was reverted to a version pin, set it back to `link:.` and reinstall:

```bash
# package.json devDependencies: "rhachet": "link:."   (was reverted to "1.44.4")
pnpm install
npm run build                    # rebuild dist so the linked bin/run.jit loads fresh code
```

✅ **`link:.` IS the committed value.** the tracked package.json MUST carry
`"rhachet": "link:."` — that is what makes the local CLI (`npx rhx`, and the `prepare:rhachet`
+ `upgrade:rhachet` scripts) run THIS worktree's build. a committed version pin (e.g. `1.44.4`)
is an **accidental defect**: it makes `npx rhx keyrack` run the stale published binary (the
`invalid --vault` symptom). pnpm links `link:.` to the local checkout on fresh install / CI, and
consumers ignore devDependencies, so a committed `link:.` is safe. a version bump (release-please
or a manual dep bump) can silently rewrite `link:.` → a version — if you see that, restore
`link:.` and commit it.

## .always rebuild dist after a src change

even with `link:.` intact, `bin/run.jit` loads `dist/`, not `src/`. after a change to a
CLI/src file, run `npm run build` (or `npm run build:compile`) before `npx rhx` — otherwise
you test stale compiled output.

## .forbidden patterns

- `./bin/rhx` / `./bin/run` directly — prefer `npx rhx` so node_modules resolution (and the
  link check) is exercised the same way a consumer hits it. `npx tsx ./bin/run` is the one
  sanctioned direct form when you must bypass the self-link entirely.
