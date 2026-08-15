# domain.term: enrolled

term.chosen   = enrolled
term.kind     = verb/event       # the act `enroll` + its event `enrollment`; NOT a dobj state-suffix
term.synonyms.forbidden:
- registered
- persisted
- saved
- installed
- provisioned

## .what

**enrolled** names the ACT `rhx enroll` (which persists an actor to disk) and its EVENT
(`enrollment` — the append-only roles log `enrollment.jsonl`). the `actor/enrolled/` subdomain folder
holds the on-disk-actor operations. the word descends from the wish's own verb `rhx enroll`.

**it is NOT the dobj partition suffix.** the on-disk actor DOBJ is `ActorOndisk`, off the `ondisk`
partition adjective (paired with `inmem` — the runtime `ActorInmem`), consistent with
`CloneOndisk`/`CloneInmem`. an earlier draft named it `ActorEnrolled` as `[actor][enrolled]`; the
partition refactor superseded that dobj-suffix with `ondisk` (see `.reason` → dispute). so `enrolled`
survives as the verb/event/subdomain word, `ondisk` owns the dobj partition axis.

## .refs

where the term is declared / used:
- src/domain.operations/actor/enrolled/                                  (the on-disk-actor subdomain folder)
- src/domain.operations/enroll/                                          (the `enroll` verb ops)
- src/contract/cli/invokeEnroll.ts                                       (the `rhx enroll` command)
- enrollment.jsonl                                                       (the `enrollment` event log, per clone actor)

## .reason

see the ref-level cluster beside this choice:
- `term=enrolled._.choice.reason.md` — etymology, why not registered/persisted, the act-vs-state axis
