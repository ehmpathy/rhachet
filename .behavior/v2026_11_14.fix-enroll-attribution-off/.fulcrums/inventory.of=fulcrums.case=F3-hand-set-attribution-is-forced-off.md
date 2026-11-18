# F3: a hand-set `attribution` is forced off

- **the fork**: when the source settings already hold `attribution` with text, (a) force `commit`
  and `pr` to `""` and keep any other subkey · (b) respect the hand-set value · (c) replace the whole
  `attribution` value with `{ commit: "", pr: "" }`
- **taken**: (a)
- **why**: the ban is fleet-wide and the wish's outcome is "no enrolled clone receives the
  attribution instruction" — (b) would let one edit reopen it. (a) over (c) keeps a subkey such as
  `sessionUrl` that a human chose, which the upsert-of-one-key spirit favors. matches the layout's
  "one answer, rhachet's"
- **rework**: clean
- **confidence**: 85% — a repo could want attribution on purpose; no such case is known
- **where**: same writer as F1
- **verdict**: —
