# F3 — the `always` opt-out key is `inherit: { always: false }`

- **the fork:** (a) `inherit: { always: false }` inside the subject section; (b) `always: false`
  inside the subject section; (c) a top-level list, e.g. `always.not_for: [101]`
- **taken:** (a). (b) reuses the name of a peer section as a field, which reads as a nested
  `always` block. (c) puts the decision far from the subject it governs. (a) names the relation,
  "this subject does not inherit always", and leaves room for a later `inherit` field
- **rework:** clean before release; dirty once a role package ships the key, since rhachet-roles-ehmpathy
  would declare it in `subject.101`
- **confidence:** 70%. a key name a role author types, chosen without the author's input
- **where:** `1.vision.yield.md` .the contract · `case=3`
- **verdict:** —
