# F22 — one rule row holds the declared hook and its resolved plan

## .the fork

`HookDispatchRule` holds the declared fields (event, matcher, timeout, author, command) and the
resolved plan (kind, path, frame, args) in one record, so a round trip back to a `BrainHook` needs a
normalizer at its boundary.

- **(a)** keep one row; let each normalizer stay at its boundary
- **(b)** store `{ declared, plan }`

## .taken

(a) for the record shape. the parts of (b) that do not touch the record are taken now (i007 r011
nitpick.4):

- one path function, `getHookDispatchManifestPathOfBrainDir`, used by the sync, the enroll derive
  and the actor tally
- one identity, read off `BrainHook.unique`: `isHookOfUnique` (the manifest adapter, the take-back)
  and `asHookUniqueKey` (the actor tally)

the `{ declared, plan }` split changes the record that the manifest, the enroll narrow, the sync
adapter and the settings derive all read, and the v1 row shape, which #765 extends next. it belongs
in its own pr, where the v1 → v2 move is reviewed as one change.

## .rework

dirty for the split: every caller of `HookDispatchRule`, the manifest text, the parser and the bash
`read` list move together.

## .confidence

85%. what the record should look like is easier to answer once #765's per-rule filter shows its
shape.

## .where

`src/domain.objects/HookDispatchRule.ts`

## .verdict

open on the split, for the director at the pr; the path and identity functions landed at i007.
