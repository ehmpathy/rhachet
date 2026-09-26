# rule.require.thinnest-import-path

> **load a module only when its code runs, and through the thinnest path to it. never eager-import a graph a call may not need.**

## .why

- every `rhx` call is a fresh node process. its module-eval cost is paid on every call, by every human, hook, and test
- the cost is per FILE, not per byte: each `require` is a disk read. on a loaded box a file costs ~2–3ms of wall, so 4k files cost 10–15s while the cpu sits idle
- an eager import pays for the whole reachable graph, whether or not the call reaches that code

measured 2026-09-24: `rhx init` loaded **4150** modules (the aws sdk, clone, act, keyrack) for a command that needed ~1300. `invoke.ts` imported all sixteen command registrars at the top, and the git-root lookup imported a package barrel of ~570 modules for a 10-line walk. the fix cut `init` from ~14s to ~5s wall.

## .the three moves

| the shape | the thin path |
|---|---|
| a dispatcher over N commands | a table of lazy loaders; load the one the argv names (`invoke.ts` `COMMAND_REGISTRARS`) |
| a getter that may never be called | `await import(...)` inside the getter, never at the top of the file (`genContextConfigOfUsage`) |
| one function from a package barrel | a local zero-dep equivalent, or the package's subpath entry. never the barrel on a hot path |

```ts
// 👎 eager — every caller pays the whole graph at module-eval
import { getRoleRegistriesByConfigImplicit } from './getRoleRegistriesByConfigImplicit';

// 👍 lazy — paid only by the call that reads it
const { getRoleRegistriesByConfigImplicit } = await import('./getRoleRegistriesByConfigImplicit');
```

🟡 under commonjs, tsc compiles `await import('./x')` to an in-function `require()`, so it stays typed and loads at call time.

| when… | then… |
|---|---|
| you add an import to a cli entry, a context builder, or a module every command loads | 🔴 ask what fraction of calls reach it. not all → lazy |
| you import one function from a package's root | check its load count. a barrel → a subpath entry, or a local walk |
| a command feels slow and the cpu is idle | count the loads (`Module._load` hook) before you blame the box |
| you add a command | register it in the lazy table, never as a top-level import |

## .how to measure

hook `Module._load`, count loads and time per subtree, sort by loads. `user+sys` far below `real` means file i/o, not compute.

## .scope

production source under `src/`, above all the cli entry (`src/contract/cli/`) and whatever it loads for every call. a leaf module that its sole caller always runs may import eagerly.

## .enforcement

- an eager import, in a module every cli call loads, of a graph most calls never run = **blocker**
- a package barrel imported for one function on a hot path = **blocker**
- a new cli command registered by a top-level import in `invoke.ts` = **blocker**

## .see also

- `rule.forbid.eager-esm-imports-in-prod` — the esm/cjs twin: a lazy load there is for correctness, here for cost
- `bin.dispatcher.pattern` — the bun fast path for `run` and `roles boot/cost`
