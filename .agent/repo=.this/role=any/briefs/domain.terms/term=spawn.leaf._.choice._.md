# domain.term: spawn.leaf

term.chosen   = leaf
term.kind     = noun
term.boundary = spawn
term.synonyms.forbidden:
- terminal
- sink
- endpoint
- final

## .what

a **leaf** is a clone or repl brain that may spawn no one. it answers, and stands up no clone of
its own. per the ehmpathy/rhachet#577 rule, a reviewer is a leaf; a work clone is not, at any depth.

the spawn that mints a reviewer sets the mark (`RHACHET_CLONE_LEAF=1`) in the child env:

| door | the child is a leaf when |
|---|---|
| `enroll` | the enroll is print-mode (`rhx enroll claude -p '…'`) |
| `repl` | always (`rhx review`, `rhachet ask`, `rhachet act`) |

a leaf caller that tries either door is refused, before any dir, child or scope exists:

```
✋ ConstraintError: a reviewer clone may not spawn
```

## ⚠️ .the boundary — the door is the mark, never the roleset

an everyday `claude` carries the ambient roles, `reviewer` among them, and must stay a work clone.
so the mark comes from how the clone was spawned, never from the roles it holds (fulcrum F23).

## ⚠️ .the boundary — the mark survives every path

a pty wrap, a detached `--async` host (which re-derives the mark from the argv it replays), and a
shell the leaf opens all carry the mark down. a detached host's own env is never the leaf.

## .refs
- `src/utils/cloneEnvKeys.ts`                               # `leaf` — the env key
- `src/domain.operations/spawn/isCloneSpawnChildLeaf.ts`    # the door mints the mark
- `src/domain.operations/spawn/isCloneSpawnCallerLeaf.ts`   # the caller reads it
- `src/domain.operations/spawn/assertCloneSpawnAllowed.ts`  # the one refusal both doors share
- `blackbox/cli/enroll.acceptance.test.ts`                  # `rhx enroll reviewer leaf`
- `blackbox/cli/askAct.spawnDepth.acceptance.test.ts`       # the repl doors

## .reason
- `term=spawn.leaf._.choice.reason.md`
