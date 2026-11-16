# F3 — per-brain auth knowledge lives in a brain auth adapter

## .the fork

the wish says the read goes "through the BrainCli", but no `BrainCli` interface exists; the name is
a prefix on enroll and spawn operations. options:

- A. a brain auth adapter per brain, found via the brain command table
  (`getSupportedBrainCommand.ts:37-53`), that owns endpoints, client id, credential file shape
- B. claude-only code in `src/domain.operations/brain/auth/`, no seam
- C. the adapter in the `rhachet-brains-anthropic` supplier package

## .taken

A — a seam for a second brain at the cost of one table entry. C may be the better home once the
supplier package grows; that move is clean.

## .confidence — 70%

"through the BrainCli" may instead mean read via the claude cli binary itself (e.g. its `/usage`).
the wisher should confirm.

## .as built

the seam is the deps context, not a table entry yet: every reach to the provider and the login cli
rides `genContextBrainAuthAccount` (`mint`, `getProfile`, `getUsageReply`, `spawnLogin`), and all
claude knowledge sits under `account/claude/`. with one brain, a lookup table keyed by brain would
hold one row; the `--brain` flag of `set` refuses every other brain with exit 2. the table lands
with the second brain, as a context per brain behind the brain command table. rework clean: one
lookup added where the context is built, no caller changes.

## .where

- `1.vision.yield.md` → contract
- `src/domain.operations/brain/auth/account/genContextBrainAuthAccount.ts`

## .verdict

disputed — for the council (whether the table is owed before a second brain exists).
