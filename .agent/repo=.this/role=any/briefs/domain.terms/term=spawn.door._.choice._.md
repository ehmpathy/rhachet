# domain.term: spawn.door

term.chosen   = door
term.kind     = noun
term.boundary = spawn           # a door through which a brain is spawned; never a brain-dir boot file
term.synonyms.forbidden:
- path
- route
- entry
- source

## .what

a **spawn door** is one of the code paths through which a process stands up a child brain. there
are two, and the leaf check (`assertCloneSpawnAllowed`) guards both with one check:

| door | the caller | the child |
|---|---|---|
| `enroll` | `rhx enroll` (`invokeEnroll`) | a clone, with its own pty, socket and serial |
| `repl` | `asBrainReplWithContextBound` (a review skill's `ask`/`act`) | a repl brain, with no socket and no serial |

the door changes two rules:
- **depth** — a tty `enroll` with no depth var mints a top-level clone (0), and the `repl` door
  never mints 0. a tty `enroll` that carries a var mints var + 1, as every other spawn does
- **leaf** — every `repl` child is a leaf; an `enroll` child is a leaf only when the enroll is
  print-mode (`-p`). so the door, never the roleset, decides who is a leaf (`spawn.leaf`)

## ⚠️ .the boundary — the word `door` carries a second sense here

in the brain-dir briefs (`define.brain-dir-repo-vs-actor`) a "door" is a FILE the brain cli reads
(`CLAUDE.md`, `AGENTS.md`). that sense is prose, never a contract field. a spawn door is a contract
field (`asCloneSpawnDepth({ env, isTty, door })`). so the two are told apart by boundary: `spawn.door` names a
spawn path, and a brain-dir door names a boot file.

## .refs
- `src/domain.operations/spawn/asCloneSpawnDepth.ts`                # `door: 'enroll' | 'repl'`
- `src/domain.operations/spawn/withCloneSpawnDepthScope.ts`          # the repl door
- `src/contract/cli/invokeEnroll.ts`                                 # the enroll door
- `src/domain.operations/spawn/assertCloneSpawnAllowed.ts`           # the one check both doors share
- `src/domain.operations/spawn/isCloneSpawnChildLeaf.ts`             # the door decides the leaf mark

## .reason
see the ref-level cluster beside this choice:
- `term=spawn.door._.choice.reason.md` — why `door`, the rejected peers, the overload argued
