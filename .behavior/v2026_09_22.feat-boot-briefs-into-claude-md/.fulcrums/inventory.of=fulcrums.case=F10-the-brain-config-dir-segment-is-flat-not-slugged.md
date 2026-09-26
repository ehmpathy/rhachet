# F10 — the brain dir segment is flat, not slugged

## .fork

| # | `CLAUDE_CONFIG_DIR` | verdict |
|---|---|---|
| **i** | **`<actorDir>/brain/.claude`** | ✅ **taken** |
| ii | `<actorDir>/brain/claude/.claude`, beside a future `brain/codex` | ❌ |

## .verdict — RULED (S23): (i) flat

## .grounds

- `genEnrollmentHash` digests `{ brain, roles }`: a different brain is a different hash, so a
  different actor dir. within one actor dir the brain is a constant, and a coordinate segment for an
  axis with one position is noise.
- a peer brain cli is a peer actor, at its own path.
- the code already writes the flat segment: `syncHooksForLinkedRoles.ts:182-187` joins
  `getActorOndiskDir(...)` + `'brain'` for every enrolled actor. (ii) would be a migration of every
  actor dir on disk, not a rename.
- the slug-actor case is void: no production code reads `actors.yml` (`getActorOndiskDir.ts:9`), so
  no actor's brain can change in place. it returns as a constraint the day `actors.yml` ships.

## .where

- blueprint `getBrainOndiskDir` · vision `.the shape` · brief `define.brain-dir-repo-vs-actor`
- seeds S21, S23
