# domain.term.choice.reason: spawn.door

## .etymology

why `door`: the depth limit is a guard at an entrance, and a door is the plain word for an entrance
you can guard. the vision of `v2026_10_07.fix-clone-spawn-depth-limit` named the field
(`asCloneSpawnDepth({ env, isTty, door })`), and its review rounds argued the rule as "two doors,
one check", so the word was settled before code.

the rejected peers:
- `path`. overloaded: a filesystem path is the commonest sense in this repo
- `route`. a declared domain term already (a driver's sequence of stones)
- `entry`. reads as a log row or an entrypoint file
- `source`. a clone's `source` is already the actor or clone it is baked from (`make` / `fork`)

## .disputes

### dispute: door — raised 2026-10-19 — status: RESOLVED (keep `door`, qualified by `spawn`)
- raised.by  = the self review `has-consistent-conventions` of stone 5.1
- claim      = `door` already names a brain-dir boot file (`CLAUDE.md is the ungated door the cli
               always reads`), so a second sense in a contract field overloads one word
- counter    = the brain-dir sense lives in prose and comments only, never in a contract. a rename
               would diverge from the approved vision's contract, and each candidate above collides
               worse. `rule.require.boundary-qualified-terms` gives the cure for one word in two
               boundaries: qualify it, and do not coin a synonym
- resolution = keep `door` as `spawn.door`. if a brain-dir door is ever itemized, it is
               `brain.dir.door`, a separate cluster

## .evidence
- discovery: the vision's contract and its peer review rounds (i004–i011) each name "both doors"
- invariant: the `repl` door never mints depth 0; the `enroll` door mints 0 only at a tty
