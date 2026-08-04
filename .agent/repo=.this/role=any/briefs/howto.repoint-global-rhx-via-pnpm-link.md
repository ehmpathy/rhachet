# howto: repoint the global `rhx` at your local build via `pnpm link --global`

## .the problem

the bare `rhx` on your PATH points at the **globally-installed, published** package
(`~/.local/share/pnpm/rhx` → `rhachet@<published>`). that global binary does NOT carry your
worktree's unreleased changes. so when your feature adds a new capability the published version
lacks — a new keyrack **vault adapter** (`aws.params`), a new CLI flag, a new mech — the bare
`rhx` crashes or misbehaves on any input that exercises it.

the classic symptom: a live key in your **host manifest** (`~/.rhachet/…`) uses your new feature,
and every `rhx keyrack unlock` now dies with:

```
vault adapter not found {"vault": "aws.params"}
```

even though your `src` + a fresh `npm run build` both have the adapter — because the bare `rhx`
never reaches this worktree.

> this is the host-manifest twin of the `link:.` hazard in
> `howto.test-local-rhachet.md`. that brief covers `npx rhx` reaching `node_modules` (the
> per-repo self-link). THIS brief covers the **global** `rhx` on your PATH.

## .the fix — link the global binary at your worktree

from the worktree root:

```bash
npm run build            # rebuild dist first — the linked bin loads dist/, not src/
pnpm link --global       # repoint ~/.local/share/pnpm/rhx at THIS worktree
```

`pnpm link --global` makes the global `rhachet` a symlink to your checkout, so the bare `rhx`
now runs your built code. verify:

```bash
rhx keyrack unlock --owner ehmpath --env test   # the new-vault keys now unlock, no crash
```

## .the caveats

- **rebuild dist after every src change.** the linked binary loads `dist/`, not `src/` — a
  `pnpm link` without a fresh `npm run build` runs stale compiled output.
- **peerDependencies warning is expected.** the link emits e.g.
  `declastruct-aws@>=… will not resolve from the linked target` — harmless for local dogfooding;
  the peer loads normally in a real consumer install.
- **it is reversible, and a release UNDOES it.** a version bump / release reinstalls the
  published global over your link, so you must re-run `pnpm link --global` **again** after each
  release while the feature is still unreleased. (this is why you may hear "fix the global one
  again".)
- **restore the published global when done:**

  ```bash
  pnpm add --global rhachet@latest   # or: pnpm remove --global rhachet && re-add
  ```

## .the mental model — three `rhx`, three lookups

| you type | points at | carries your local change? |
|----------|-----------|-----------------------------|
| `rhx` (bare, on PATH) | `~/.local/share/pnpm/rhx` — the **global** install | ❌ published — **unless `pnpm link --global`** |
| `npx rhx` / `./node_modules/.bin/rhx` | this repo's `node_modules/rhachet` | ✅ only if the `link:.` self-link holds |
| `npx tsx ./bin/run` | this worktree's `bin/run` directly | ✅ always (bypasses both) |

- use **`pnpm link --global`** when a HOST-level command (`rhx keyrack unlock`, reading
  `~/.rhachet`) must exercise your unreleased feature.
- use **`npx rhx`** when a REPO-level command must run this repo's own built CLI (see
  `rule.forbid.node-modules-bin-rhx` + `howto.test-local-rhachet.md`).
