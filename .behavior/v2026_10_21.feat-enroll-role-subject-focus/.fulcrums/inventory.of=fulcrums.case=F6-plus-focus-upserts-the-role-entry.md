# F6 — a `+role::subject` upserts the role's one entry

- **the fork:** `rhx enroll claude +mechanic::flow` where the ambient set already holds `mechanic`
  whole (true of this repo, and of most repos that would want a focus). the incremental merge
  (`computeBrainCliEnrollment.ts:69-91`) starts from the ambient set and adds the token, so the set
  becomes `{mechanic, mechanic::flow}`, and `prepare:rhachet` appends the same pair
  (`asPrepareRhachetRolesDelta.ts:64-70`). the choices: (a) refuse, as S1, and name the fix
  `-mechanic +mechanic::flow`; (b) upsert: the set holds one entry per role, so `+mechanic::flow`
  narrows a whole `mechanic` to `flow`, and joins `flow` to the foci of an already-focused entry;
  (c) no-op, since the whole role already boots `flow`
- **taken:** (b). (a) makes the wish's own delta form fail in exactly the repos it was written
  for, and a refusal on every install once `prepare:rhachet` holds the pair. (c) makes the token
  do naught with exit 0, a silent surprise. (b) keeps S1's refusal for the one case it was meant
  for, an exact set that names a role both ways, and the receipt names the narrow
- **rework:** clean. one branch in the delta merge and one in the prepare patch, both pure
- **confidence:** 55%. a `+` that narrows reads backwards to a commander who thinks of `+` as
  "more"; (a) is the safer read of that intuition
- **where:** `1.vision.experience.case=_.md` S3 · `case=4` `[t4]` · the yield's "where" row
- **verdict:** —
