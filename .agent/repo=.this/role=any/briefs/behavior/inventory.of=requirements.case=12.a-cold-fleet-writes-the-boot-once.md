# requirement: a cold fleet of one boot writes the boot to cache once, not once per clone

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- when N clones of one boot get their first `rhx clone say` at once, cold, only the first say's request
  writes the boot; the rest wait until that request's first reply begins, then read the boot from cache
- the wait is bounded: 5s while the lead has claimed and not sent, 45s once it has sent; past the bound,
  or if the lead is DEAD, the say goes unheld and writes the boot itself
- the wait is never silent: in tree output, stderr names the hold as it begins (its bound, the lead, and
  whether the lead has sent) and as it ends; under `--output json`, the same lines go to the clone's
  durable trace log, so stderr stays a machine channel
- a gate fault (mutex contention, an i/o fault) never fails the say: it prints its cause and the say goes
  unheld; any other error is a defect and is thrown
- a client command (`/model …`) and a clone's later says pass the gate untouched

## .scope

- the gate holds the `say` channel only. a fleet of `rhx enroll … -p` sends its first requests at spawn
  and is not gated (fulcrum F9 of `.behavior/v2026_11_02.fix-boot-briefs-cacheable`, flagged to the
  wisher)
- the lead record lives under one worktree's `.agent/.actors/.boot.leads/`; a fleet spread across
  worktrees is not gated
- the key is the content hash of the actor's live `boot.md` at the first say; the model is not in it
  (fulcrum F8)
- the gate reads a lead's progress off the lead's `history/` links. clones of one actor share one
  transcript dir, so a fleet spawned close together can leave a lead's history empty (quarantined as
  ambiguous) or link a peer's transcript; the gate then goes unheld or holds to its bound, never fails a
  say. the cure, a session id pinned at spawn, is owed (fulcrum F13)

## .why

the api makes a cache entry readable only once the first response starts; N cold requests in flight
together each write the boot. a boot runs ~120k–185k tokens, so a fleet of six pays five extra writes
at the write rate.

## .clamp

- `src/domain.operations/clone/fleet/holdFirstSayForBootCacheOrUnheld.ts` — the gate, called from
  `invokeCloneSay` on each say that is no client command
- `src/domain.operations/clone/fleet/asBootCacheLeadDecision.ts` — the bounds

## .proof

| tier | test | status |
|---|---|---|
| unit | `asBootCacheLeadDecision.test.ts`, `asBootCacheHoldNotice.test.ts` (snapped) | ✓ |
| integration | `holdFirstSayForBootCache.integration.test.ts` — the waits, the bound that grows mid-hold, startup rows read as not started, a fault tolerated, a defect thrown | ✓ |
| acceptance | `blackbox/cli/clone.say.bootcache.acceptance.test.ts` — case1 faulted, case2 held then released, case3 json, case4 a cold fleet of four: the claim a real first say writes, a warm read, the 45s bound; through the real cli, stub clones. the lead's progress rows are seeded (F13) | ✓ |
| live | a real fleet of haiku clones, the second's call 1 reads the boot | ⏳ owed — a live fleet spends the paid key, so its test belongs on `BRAIN_LIVE_SCOPE=all`; not yet written |

## .source

the approved vision of `.behavior/v2026_11_02.fix-boot-briefs-cacheable` (case 9, fulcrum F4 ruled yes
by the wisher 2026-11-02); the gate's place at the first say, fulcrum F5, ruled yes by the wisher.
