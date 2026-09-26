# F19 — the per-session brief census

## .fork

today each `SessionStart` prints a `<stats>` block per role: files, chars, tokens, price. D3 retires
the role boot hook, so that print stops. what replaces it?

| branch | verdict |
|---|---|
| a. accept the loss | ❌ |
| **b. print a census at render time** | ✅ **taken** |
| c. a new per-session surface | ❌ widens into boot work the wish bounds out |

## .verdict — TAKEN (b), unruled

- `getOneRoleBootContent` returns `{ body, stats }`, stats apart from the body (D2).
- `rhx enroll` prints one line: the `boot.md` path, its role count, its chars.
- `rhachet roles boot` keeps its full stdout, stats included — a human inspects one role with it.

## .grounds

- the corpus changes at render, never at session start; a print at the moment it changes is the
  signal, a per-session reprint of an unchanged number is noise.
- stats stay out of `boot.md`: a price constant in the body would break byte-determinism.

## ⚠️ .the cost, open to the wisher

the per-session census is lost in full, not thinned. D3 deletes the one hook that printed it, and
no session-start surface replaces it. what remains prints only when a corpus is written: `rhx
enroll` names the `boot.md` path, role count and chars; `rhx init` and `rhx upgrade` report each
render. a human who reopens a clone sees no census, and a compaction reprints none.

## .where

- blueprint D2, D3, `getOneRoleBootContent`, the enroll codepath · `.snapshots` · blueprint Q2
