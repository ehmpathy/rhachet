# domain.term: clone

term.chosen   = clone
term.kind     = noun            # a domain-object (dobj): [...noun][state]?
term.synonyms.forbidden:
- session
- instance
- process
- thread

## .what

a **clone** is a live (or revivable) instance of an **actor**. every clone of an actor shares that
actor's brain, roles, and config; a clone differs from its peers ONLY by its **session** — its
`serial` (primary ref) + its `--as` slug (unique ref), its `history` (a BrainSeries of episodes,
symlinked from the brain-cli's own transcripts), and its `socket` (dispatch; its liveness IS the
clone's liveness — no stored state). clones are spawned by `rhx enroll` / `rhx clone`, revived by
`exid` (read from the history link name), and forked from a root via `rhx clone clone://<serial>`.

## .refs

- .agent/repo=.this/role=any/briefs/define.actor-clone-hierarchy.md  (the hierarchy: clone → actor → { brain, roles })
- .agent/repo=.this/role=any/briefs/define.rhachet.v3.md             (rhachet mission: "clone that thought")
- src/domain.operations/brainContinuation/genBrainSeries.ts          (a clone's history is a BrainSeries)

## .reason

see the ref-level cluster beside this choice:
- `term=clone._.choice.reason.md` — etymology, the actor-vs-clone axis, why not session/instance, evidence
