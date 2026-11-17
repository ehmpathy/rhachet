# fix(clone): a clone history links its own session by id, never by a spawn window

a dedicated PR, planned from ehmpathy/rhachet branch `fix-boot-briefs-cacheable` (fulcrum F13).

## .the gap

- clones of one actor share one transcript dir, so every peer transcript is a candidate for the history link
- the link admits a transcript by its birth within `spawnedAt − 2s`; two candidates refuse all (`.exids/*.ambiguous`), one is adopted, whose it may be
- the boot cache gate reads a lead's progress off that history, so a close-spawned same-actor fleet reads its lead as unsent, or a follower as started. it fails safe (bounded at 5s / 45s), and the boot cache share is lost

## .the bounded diff

1. at spawn, mint a uuid and pass `--session-id <uuid>` to the brain-cli; store it in the clone dir
2. link `history/` by that id alone (`<uuid>.jsonl`); drop the window and the ambiguous refusal for it
3. keep the window as the declared fallback for a brain-cli that takes no session id
4. clamp: a stub fleet of four clones of one actor, spawned back to back; each `history/` holds exactly its own transcript, and the boot cache gate holds the three followers

## .files

- `src/domain.operations/clone/genCloneHistoryLink.ts`
- `src/domain.operations/clone/pty/genBrainCliPtyClone.ts`, `genBrainCliPlainClone.ts`
- `src/contract/cli/invokeEnroll.ts`
- the brief `define.invariant.clone-history-holds-only-its-own-session` (its provenance residual closes)

## .why its own PR

it changes the clone subsystem's identity rule: how every clone, of every actor, finds its own transcript. `clone get`, the history invariant, enroll, and both spawn paths read that rule. it is a core contract with many callers, so it gets its own focused review.
