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

⚠️ **`depth` names TWO quantities here, and only one of them is a limit.** the distinction is the
whole subtlety of the term:

| the quantity | what it is | where it lives |
|---|---|---|
| a clone's **own** depth | a **fact** — how far down the chain it was born | `CLONE_ENV_KEYS.depth` in that clone's env |
| `CLONE_SPAWN_DEPTH_MAX` | a **limit** — the largest such fact we permit to be minted | a constant, `= 1` |

⇒ a fact is read; a limit is checked against. `asCloneSpawnDepth` is the seam: it reads the
**caller's** fact and returns the **child's**, which is then checked against the limit.

## .what

**how many spawn hops separate a clone, or a repl brain, from the top-level clone of its chain.**

```
a human at a tty     depth —   (whatever var the pane inherited)
  └─ their clone     depth 0   a tty `rhx enroll`, or a raw `claude`
       └─ a spawn    depth 1   ← the limit, CLONE_SPAWN_DEPTH_MAX — a peer, a reviewer, a repl brain
            └─ ✋    depth 2   refused: `clone spawn depth limit reached`, exit 2
```

two doors mint a depth, and one check guards both: `rhx enroll`, and the repl seam
(`asBrainReplWithContextBound`). a tty is the one signal a brain cannot fake, so only a tty
`rhx enroll` mints 0; every no-tty spawn, and every repl brain, is at least 1.

## 🚨 .the boundary — a spawn chain is unbounded by NATURE

every clone carries the same CLI, so **a clone that may spawn can spawn a clone that may spawn**.
with no bound the chain forks until the host runs out of ptys, and each link costs a real brain.

⇒ the limit is not a safety rail bolted onto a bounded domain. it is the **only** bound there is.

## ⚠️ .the boundary — the +1 is the subtlety

`asCloneSpawnDepth` reads `CLONE_ENV_KEYS.depth` — the **caller's** depth — and returns
`parsed + 1`, the **child's**. the value read and the value returned are two different clones'
facts, which is why the transformer is named rather than inlined (`rule.require.named-transformers`).

| the caller | the env holds | the child would be born at | vs limit 1 |
|---|---|---|---|
| `rhx enroll` at a tty | any | `0` | ✅ permitted |
| a no-tty spawn | absent | `1` | ✅ permitted |
| a no-tty spawn, or a repl call | `0` (a top-level clone) | `1` | ✅ permitted |
| a no-tty spawn, or a repl call | `1` (a spawn) | `2` | ❌ refused |

## ⚠️ .the boundary — a malformed value reads as a depth-0 caller, deliberately

an absent, unparseable, or negative value — any value that is not a whole run of digits, so `9x`
and `1.5` too — reads as a depth-0 **caller**, so its child is depth 1
rather than a fault. the var is injected by our own spawn, so a malformed one means the env was
hand-edited or inherited from a foreign tool — neither of which is evidence of a deep chain.

- to **fault** here would convert a cosmetic env smudge into a spawn that cannot run at all
- to read it as a **fresh chain** (child 0) would let any unmarked spawn start a chain over
- ⇒ a smudge is one level loose at most, never a lockout and never a reset

## ⚠️ .the boundary — an `--async` enroll hands its depth to the host

the detached host runs with no tty, so it must not re-read one. the caller decides the depth in the
foreground and hands it over as `CLONE_ENV_KEYS.depthMinted`, honored only on a process marked
`hostDetached`; the host drops it before it spawns a child.

## .refs
- `src/domain.operations/spawn/asCloneSpawnDepth.ts`   # the +1 seam and `CLONE_SPAWN_DEPTH_MAX`
- `src/utils/cloneEnvKeys.ts`                           # `depth` — the env key the fact rides
- `src/domain.operations/spawn/assertCloneSpawnDepthWithinLimit.ts`  # the one refusal both doors share
- `src/domain.operations/spawn/withCloneSpawnDepthScope.ts`          # the repl door's scope
- `src/contract/cli/invokeEnroll.ts`                    # the enroll door, which checks before any clone dir exists
- `blackbox/cli/enroll.acceptance.test.ts`              # `rhx enroll depth limit` — refuse + permit

## .reason
see the ref-level cluster beside this choice:
- `term=spawn.depth._.choice.reason.md` — etymology, the wisher's bound, the rejected peers
