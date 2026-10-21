# F19 — the enroll json handoff does not carry the clone's depth

**the fork:** (a) leave the `--output json` handoff as `{ outcome, serial, slug, socketEligible }`; a headless caller learns a clone cannot spawn at its first refusal · (b) add a `depth` field, so a supervisor sees "this clone cannot spawn" at mint time.

**taken:** (a). the wish asks for a wall and a loud refusal, and both hold. the handoff is a published machine contract; a new field moves its snapshots and its readers, which is a contract change this pr does not need to deliver the wall. the readme now states which callers mint depth 1 (a pipe, cron, ci, a parent clone), so a supervisor can know it before the first refusal.

**rework:** clean. (b) is one additive field and a resnap; no reader depends on its absence.

**confidence:** 80%. low only because a supervisor that enrolls headless drivers would read the field every time.

**where:** `src/contract/cli/invokeEnroll.ts` (the json handoff); raised as r010 i008 nitpick.2.

**status:** open — for the council.

**verdict:** —
