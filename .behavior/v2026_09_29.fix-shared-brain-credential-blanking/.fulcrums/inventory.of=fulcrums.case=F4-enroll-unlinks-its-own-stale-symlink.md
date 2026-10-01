# F4 — enroll removes an actor's brain-dir credential once no clone of the actor lives

## .the fork

when enroll finds a 1.48.0 credential in an actor's brain dir (a symlink to `~/.claude`, or a real file): (a) leave it; (b) remove it at once; (c) keep it while a clone of the actor lives, else remove it.

## .taken, and why

(c).

- under O3 no clone reads a brain-dir credential: `CLAUDE_SECURESTORAGE_CONFIG_DIR=''` points every clone at `~/.claude`. a leftover is dead weight for new clones, and a trap for a reader who takes it for the login
- a pre-cure clone still alive reads and refreshes that file under its own lock set. to pull the file from under it makes its next refresh write a private login, which strands the shared one. so the leftover stays while any clone of the actor is LIVE or DEAF (`getCloneReachState`, the gate `define.brain-dir-repo-vs-actor` uses for "active")
- once none lives, a symlink is removed as a link (the shared login untouched), and a real file is removed after the F7 adoption check

no spawn path bypasses this step: `invokeEnroll` is the only caller of `genCloneOndisk`, and the migration runs before the spawn.

## .rework

clean — one migration step before the spawn.

## .confidence, and why it is not higher

80%. the live count costs a reach-state probe per enroll, but only when a leftover exists. a pre-cure clone that outlives every enroll keeps its file until an enroll runs after it exits; the enroll output names that count and the respawn cure.

## .where

case 3; `setBrainDirAuthMigrated`.
