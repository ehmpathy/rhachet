# F1 — a role whose init failed counts as linked

- **fork:** on a part-way failure, (a) the failed role stays linked and its hooks sync, or (b) init
  unlinks the failed role, so only roles whose init passed keep hooks
- **taken:** (a). a role links before its init runs today, and enroll counts linked roles; (a) keeps
  the settings true to what enroll will see, with no new unlink step
- **rework:** clean — one branch in the failure path
- **confidence:** 70%. the director's words say "roles not enrolled"; whether a failed init means "not
  enrolled" is theirs to say
- **where:** `1.vision.yield.md` → [c3], open question 1
- **verdict:** —
