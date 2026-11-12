# F12 — a clone's subagent boots without the roles' briefs

## .the fork

a non-fork subagent inherits the `CLAUDE.md` hierarchy (vendor sub-agents doc; Explore and Plan opt out).
under the old door the boot rode `CLAUDE.md → @boot.md`, so a `general-purpose` subagent of a clone read
the roles' briefs. the new door puts the boot in the clone's system prompt and switches the `CLAUDE.md`
door off; `rhx boot.subagent.probe` measured the subagent's request: its own 3,121-char prompt, no boot.

- **A** — accept: a subagent carries no roles' briefs; state it as a scope edge, catalog it, and flag it
- **B** — keep the `CLAUDE.md` door open for subagents too: the main clone then loads the boot twice,
  the second copy after the per-session values, which is the cost the wish exists to remove
- **C** — deliver the boot to subagents by another route (a SubagentStart hook, or agent definitions that
  name the boot); unmeasured, and the vendor surface for it is unverified

## .taken

A, for this round, flagged to the wisher. any design that moves the boot into the system prompt loses the
`CLAUDE.md` path to subagents, the vision's own design (stop the `@boot.md` import) included, so this is a
cost of F1/F6, not of the env switch alone. B undoes the wish. C is a design of its own.

## .what is unmeasured

the old door's subagent request was not captured, so "the subagent had the boot before" rests on the
vendor doc, not a probe; a capture needs a funded key (`boot.subagent.probe` would scan `messages[0]`).

## .rework

clean for A → C: an added delivery route, no change to the clone's door.

## .confidence — 60%

the wish binds "keeps every brief it boots today" to the corpus (F2, ruled yes), and a subagent was not
named in it; whether a subagent's briefs are in scope is the wisher's call.

## .where

- `src/domain.operations/enroll/asBrainCliSpawnEnv.ts` (the switch)
- `.agent/repo=.this/role=any/skills/boot.subagent.probe.sh`

## .verdict

open, flagged to the wisher
