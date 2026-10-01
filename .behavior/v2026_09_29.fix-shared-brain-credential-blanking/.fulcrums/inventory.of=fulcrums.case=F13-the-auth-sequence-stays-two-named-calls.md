# F13 — enroll's credential sequence stays two named calls, not a wrapper

## .the fork

before a spawn, `invokeEnroll.ts` runs two operations in a fixed order: `setBrainDirAuthMigrated` (adopt or remove the brain-dir login), then `assertBrainAuthNotDead` (refuse a dead shared login). the order may (a) stay as two named calls inline in the orchestrator, or (b) move into one wrapper operation that owns the sequence as its own contract.

## .taken, and why at the time

(a).

- each call is its own named operation with its own tests; the orchestrator reads as two sentences in order
- the order is clamped at contract grain: `enroll.shared-brain-auth.acceptance.test.ts` `[t4]` adopts a live brain-dir login beside a dead shared one, then must pass the dead check. a swap of the two calls fails that case
- a wrapper for two lines adds a file and a name and no guarantee the acceptance case lacks

## .rework

clean — an extract of two adjacent calls into one operation touches one orchestrator and adds one file.

## .confidence, and why it is low

80%. the reviewer asks for a unit that owns the sequence so the order is proven below acceptance grain; a council that weights fast feedback may prefer that.

## .where

`src/contract/cli/invokeEnroll.ts`; review i006 r011 point.2.
