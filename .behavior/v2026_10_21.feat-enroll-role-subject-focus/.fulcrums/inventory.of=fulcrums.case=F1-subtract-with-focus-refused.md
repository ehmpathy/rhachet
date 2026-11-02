# F1 — `-role::subject` is refused, not a partial removal

- **the fork:** (a) refuse `-mechanic::flow` and point at `-mechanic`; (b) remove only the `flow`
  focus, and keep mechanic at its other foci; (c) treat it as `-mechanic`
- **taken:** (a). a subtraction removes a member of the roleset. (b) needs the set to hold foci
  per role and then defines "mechanic at every subject but flow", a shape no boot.yml has. (c)
  silently ignores what the caller typed
- **rework:** clean. it is one branch in `getRoleDeltas`; (b) could replace it later, since no
  caller relies on the refusal
- **confidence:** 65%. low because (b) is a plausible ask once multi-focus seats exist, and
  `F6`'s one-entry-per-role rule makes it cheaper: atop a focused entry `mechanic::code.prod,flow`,
  `-mechanic::flow` would simply drop `flow` from the foci. only atop a whole entry is (b)
  shapeless. if `F6` holds, the council may prefer (b) there and the refusal only atop a whole role
- **where:** `1.vision.experience.case=_.md` P12 · `case=2` `[t2]`
- **verdict:** —
