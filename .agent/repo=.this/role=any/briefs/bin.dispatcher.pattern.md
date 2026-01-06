# bin/run dispatcher pattern

## .tldr

shell dispatcher routes commands to **bun** (fast, consistent) or **JIT** (flexible):
- `run --skill/--init`, `roles boot/cost` → bun binary (~35-70ms, predictable)
- `roles link/init`, `act`, `ask` → JIT via tsx (~300ms+, can import npm packages)

the `.agent/` pattern makes this possible: `roles link` pays the npm import cost once, all other commands read from symlinks.

## .terms

| term    | definition                                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------------------------ |
| **bun** | bun-compiled binary (`.bc`). bytecode is pre-compiled, self-contained, fast and consistent startup.                |
| **jit** | just-in-time compilation via tsx/node. transpiles typescript on demand, can resolve npm packages from target repo. |

### file names

- `bin/run.bun` - shell dispatcher that routes to bun binaries (the "bun path")
- `bin/run.jit` - entry point for JIT execution via tsx (the "jit path")
- `bin/run.bun.rhachet-run.bc` - bun-compiled binary for `run` command
- `bin/run.bun.rhachet-roles.bc` - bun-compiled binary for `roles` commands

the `.bun` and `.jit` suffixes indicate which execution model the file participates in.

## .what

the rhachet CLI uses a two-tier dispatcher pattern to route commands to either fast bun binaries or flexible JIT execution.

## .why

bun-compiled binaries embed module resolution at compile time. when the binary does a dynamic import of `rhachet.use.ts` from a target repo, and that config imports from npm packages (e.g., `rhachet-roles-ehmpathy`), bun fails to resolve those packages from the target repo's `node_modules/`.

the `.agent/` pattern solves this via separation of "link time" from "run time":
1. `roles link` runs once, imports from npm packages, creates symlinks into `.agent/`
2. all other commands read from `.agent/` symlinks - no npm imports needed

this enables bun binaries for most commands (fast) while JIT handles package-dependent commands (flexible).

## .architecture

```
bin/run (symlink)
  └── bin/run.bun (shell dispatcher)
        ├── run --skill/--init → bin/run.bun.rhachet-run.bc (bun, fast)
        ├── roles boot/cost    → bin/run.bun.rhachet-roles.bc (bun, fast)
        └── roles link/init, * → bin/run.jit (node, flexible)
```

### binaries

| binary                         | type    | use case                               |
| ------------------------------ | ------- | -------------------------------------- |
| `bin/run`                      | symlink | user entrypoint                        |
| `bin/run.bun`                  | shell   | routes to bun vs jit                   |
| `bin/run.jit`                  | node    | commands that import from npm packages |
| `bin/run.bun.rhachet-run.bc`   | bun     | `run --skill/--init` (reads .agent/)   |
| `bin/run.bun.rhachet-roles.bc` | bun     | `roles boot/cost` (reads .agent/)      |

### command routes

| command           | binary | why                                           |
| ----------------- | ------ | --------------------------------------------- |
| `run --skill`     | bun    | discovers skills from .agent/ directly        |
| `run --init`      | bun    | discovers inits from .agent/ directly         |
| `roles boot`      | bun    | reads briefs/skills from .agent/ symlinks     |
| `roles cost`      | bun    | calculates costs from .agent/ files           |
| `roles link`      | jit    | imports from npm packages to get source paths |
| `roles init`      | jit    | run-all mode needs registry (Role.inits.exec) |
| `act`, `ask`, etc | jit    | may need registry data or brain configs       |

## .key insight

the `.agent/` directory pattern enables:
- **upfront linkage**: pay the npm import cost once via `roles link`
- **fast execution**: all subsequent commands read from filesystem symlinks
- **no middlemen**: bun binaries skip package resolution entirely

this is why `roles link` can be slow (uses jit) while `roles boot` can be fast (uses bun).

## .performance

| command       | binary | startup |
| ------------- | ------ | ------- |
| `run --skill` | bun    | ~35ms   |
| `run --init`  | bun    | ~35ms   |
| `roles boot`  | bun    | ~70ms   |
| `roles link`  | jit    | ~300ms+ |

the 4-8x speedup for bun binaries justifies the dispatcher complexity.

## .consistency

bun binaries provide not just speed but **predictable execution times**.

JIT execution (tsx/node) has high variance based on:
- module cache state (cold vs warm)
- transpilation overhead (first run vs cached)
- system load and memory pressure
- disk cache warmth

bun-compiled binaries eliminate this variance:
- bytecode is pre-compiled (no transpilation)
- binary is self-contained (no module resolution)
- execution time is bounded and predictable

this consistency matters for:
- **hooks**: sessionstart and pretooluse hooks must be fast and reliable
- **IDE tools**: integrations expect consistent response times
- **composition**: skills that invoke other skills need predictable latency

## .refs

related briefs in `.agent/repo=.this/role=tuner/briefs/`:
- `perf.run.skill.md` - performance targets for `run --skill`
- `perf.run.init.md` - performance targets for `run --init`
- `perf.roles.boot.md` - performance targets for `roles boot`
- `bun.compile.realistic.durations.md` - bun binary startup expectations
- `measure.performance.accurate.md` - how to measure CLI performance accurately
