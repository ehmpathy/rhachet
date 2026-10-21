# domain.term: spawn.depth

term.chosen   = depth
term.kind     = noun
term.boundary = spawn
term.synonyms.forbidden:
- level
- tier
- generation
- hop
- rank

⚠️ **`depth` is a fact, never a limit.** it records how far down the chain a clone was born, and
it bounds no spawn. the bound on fan-out is the `spawn.leaf` mark, never a depth
(the ehmpathy/rhachet#577 rule).

## .what

**how many spawn hops separate a clone, or a repl brain, from the top-level clone of its chain.**

```
a human at a tty     depth —   (no depth var in a fresh terminal)
  └─ their clone     depth 0   a tty `rhx enroll` with no depth var, or a raw `claude`
       └─ a worker   depth 1   a work clone — may spawn
            └─ ...   depth N   a work clone at any depth may spawn
                 └─ a reviewer depth N+1, a leaf — spawns no one (`spawn.leaf`)
```

two doors mint a depth: `rhx enroll`, and the repl seam (`asBrainReplWithContextBound`). a tty
enroll with no depth var mints 0. any spawn that carries a var mints var + 1, tty or not: a shell a
clone opened carries the clone's depth, and a tty there proves only that a human may sit at it,
never that the chain is fresh. every no-tty spawn, and every repl brain, is at least 1.

## ⚠️ .the boundary — the +1 is the subtlety

`asCloneSpawnDepth` reads `CLONE_ENV_KEYS.depth` — the **caller's** depth — and returns
`parsed + 1`, the **child's**. the value read and the value returned are two different clones'
facts, which is why the transformer is named rather than inlined (`rule.require.named-transformers`).

| the caller | the env holds | the child is born at |
|---|---|---|
| `rhx enroll` at a tty | absent | `0` |
| `rhx enroll` at a tty | `N` (a shell a clone opened) | `N + 1` |
| a no-tty spawn | absent | `1` |
| a no-tty spawn, or a repl call | `N` | `N + 1` |

## ⚠️ .the boundary — a malformed value reads as a depth-0 caller, deliberately

an absent, unparseable, or negative value — any value that is not a whole run of digits, so `9x`
and `1.5` too — reads as a depth-0 **caller**, so its child is depth 1 rather than a fault. the var
is injected by our own spawn, so a malformed one means the env was hand-edited or inherited from a
foreign tool. to fault would turn a cosmetic smudge into a spawn that cannot run at all.

## ⚠️ .the boundary — an `--async` enroll hands its depth to the host

the detached host runs with no tty, so it must not re-read one. the caller decides the depth in the
foreground and hands it over as `CLONE_ENV_KEYS.depthMinted`, honored only on a process marked
`hostDetached`; the host drops it before it spawns a child.

## .refs
- `src/domain.operations/spawn/asCloneSpawnDepth.ts`   # the +1 seam
- `src/utils/cloneEnvKeys.ts`                           # `depth` — the env key the fact rides
- `src/domain.operations/spawn/asCloneSpawnPlaceEnv.ts` # writes depth and the leaf mark into a child env
- `src/domain.operations/spawn/withCloneSpawnDepthScope.ts`          # the repl door's scope
- `src/contract/cli/invokeEnroll.ts`                    # the enroll door
- `blackbox/cli/enroll.acceptance.test.ts`              # `rhx enroll reviewer leaf` — depth recorded, never refused

## .reason
see the ref-level cluster beside this choice:
- `term=spawn.depth._.choice.reason.md` — etymology, the wisher's bound, the rejected peers, and the
  S68 dispute that turned the limit into a fact
