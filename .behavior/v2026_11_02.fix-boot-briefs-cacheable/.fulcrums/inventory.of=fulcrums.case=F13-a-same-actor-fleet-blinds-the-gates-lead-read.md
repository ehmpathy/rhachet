# F13 — a same-actor fleet blinds the gate's read of its lead

## .the fork

the gate reads a lead's progress off the lead's `history/` links. clones of one actor share one
transcript dir (`CLAUDE_CONFIG_DIR` is the actor brain dir), and the history link admits a transcript by
its birth within the clone's spawn window. two failure shapes follow, both measured on a stub fleet:

- **quarantine** — two or more unclaimed transcripts in one clone's window: the link refuses all and marks
  each `.exids/<exid>.ambiguous`. measured: four `.ambiguous`, fleet1's `history/` empty. the gate then
  reads the lead as unsent, holds up to 5s, and the follower writes the boot itself
- **adoption** — one candidate within the 2s tolerance that belongs to a peer spawned just before: the
  clone links the peer's transcript, and once the peer was said to, the clone reads as already started
  (`later-say`) and goes unheld. measured: a fourth-in-line clone, spawned under 2s after a said peer

both fail safe: no say fails, and no say waits past the 5s / 45s bounds. the cost is a lost cache share,
the very cost the gate exists to save, on a fleet whose clones spawn close together.

- **A** — ship the gate as is; state the edge; seed the lead's rows in the acceptance proof; cure apart
- **B** — pin each clone's session id at spawn (`--session-id <uuid>`) and link by id, not by window
- **C** — read the lead's progress from the lead record itself (the lead writes `sent`/`answered`)

## .taken

A in this PR, and B as its own dedicated PR, filed with a title and a bounded diff:
ehmpathy/rhachet#703 (body at `appendix/dedicated-pr.F13.clone-history-by-session-id.md`).

B is the root cure: it closes both shapes and the history invariant's residual (a linked transcript's
provenance is unchecked). it rewrites the clone subsystem's identity rule, how every clone of every
actor finds its own transcript, and `clone get`, the history invariant, enroll, and both spawn paths
read that rule. a core contract with many callers clears the bar of
`rule.forbid.deferrals-short-of-a-dedicated-pr` for its own focused review. C patches the gate alone
and leaves `clone get` with the same wrong links.

## .rework

clean: B replaces the link's candidate rule; the gate's read (`getOneLeadProgress`) stays.

## .confidence — 70%

the shapes are measured; real claude writes a transcript lazily, at its first request, so a real fleet
meets them only when first says land close together. that rate is unmeasured (it needs a funded key).

## .where

- `src/domain.operations/clone/genCloneHistoryLink.ts` (the window and the refusal)
- `src/domain.operations/clone/fleet/getOneLeadProgress.ts` (the read that goes blind)
- `blackbox/cli/clone.say.bootcache.acceptance.test.ts` case4 (the seeded rows, the sayer order)
- the dedicated PR task ehmpathy/rhachet#703

## .verdict

open, flagged to the wisher; the cure is planned as ehmpathy/rhachet#703
