# howto.cut-a-pnpm-patch-of-a-release

> **a tree that needs a fix before the next release takes it as a pnpm patch of the published
> release. cut it with `rhx pnpm.patch.cut`, never by hand.**

```sh
npm run build
rhx pnpm.patch.cut --into patches/rhachet@1.54.2.patch --version 1.54.2 --prove
```

## .what the patch holds

- the diff of the published package against that package with this tree's `dist/` and text bins
  (`rhx`, `run`, `run.jit`, `hooks.dispatch.sh`) laid over it
- `bin/run.bun` rerouted to `run.jit`
  - 🔴 the bun `.bc` binaries embed code at compile time, and a text patch cannot carry a rebuilt
    binary. without the reroute, `roles boot` and `roles cost` (the stop hook) run the
    unpatched code while `enroll` runs the patched code
  - cost: each bun-routed call pays the jit start (~300ms, not ~70ms) until the release lands

## .why a skill, not a hand cut

| the hand cut | what goes wrong |
|---|---|
| `git diff --no-index a b` | the paths carry the dir names (`a/a/dist/…`), so pnpm fails with `ERR_PNPM_PATCH_FAILED` |
| `dist/` alone | the reroute is absent, so boot and the stop keep the published defect, silently |
| no proof | a patch that applies but does not change behavior reads as a success |

`--prove` installs the patched release into a scratch consumer and holds a stop on a stray mod file
through the bun route. exit 2 and the fault named means the patch is live end to end.

## .apply, in the tree that needs it

1. copy the patch to `patches/rhachet@<version>.patch`
2. add to `package.json`: `"pnpm": { "patchedDependencies": { "rhachet@<version>": "patches/rhachet@<version>.patch" } }`
3. `pnpm install`

drop the patch whole when the release ships the fix.

## .see also

- `.agent/repo=.this/role=any/skills/pnpm.patch.cut.sh`
- `bin.dispatcher.pattern` — why `run` and `roles boot/cost` go through bun
- first seen in `ehmpathy/rhachet/.behavior/v2026_11_27.fix-mods-never-block-enrollment` (fulcrum F24)
