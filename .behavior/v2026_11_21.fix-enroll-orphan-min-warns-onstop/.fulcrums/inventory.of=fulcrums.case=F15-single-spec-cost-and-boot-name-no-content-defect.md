# F15 — the single-spec `roles cost` and `roles boot` name the defects their payload sets aside

- **fork**: name a role's content defects on the single-spec arms (`roles cost --repo X --role Y`, `roles boot`); or name them only on the birth receipt, the stop, and the roster
- **taken**: name them on both arms, from the payload. `genBootPayload` carries `defects`; `roles boot` prints the human receipt on stderr, so the payload on stdout stays the corpus; `roles cost` prints it after the cost readout
- **why**: a set-aside a command does not name is a surprise, and the peer reviews flagged it on each arm. the payload already holds the orphans, so the receipt needs no second scan
- **bound**: a role dir whose only file is an orphan yields no payload: an empty universe, which both arms report as `🟡 no resources found — this boot emits naught`. the orphan is named there by the stop and the roster, which read the role dir apart from any payload. to carry defects through a null payload would change the shape every caller of `genBootPayload` reads, for a role that boots naught either way
- **rework**: clean. a payload that carries defects on an empty universe, and a branch in each caller
- **confidence**: 75%
- **pinned**: `roles.content-defects` [case7.2] snaps the orphan-only `roles boot` (`🟡 no resources found`), and clamps that the stop still holds on the orphan
- **where**: 5.1 peer review i003 r9 nitpick.1; 5.3 peer review i001 r1 nitpick.3, r2 nitpick.1; 5.3 i003 r2 nitpick.1; 5.3 i004 r10 nitpick.5
- **verdict**: open
