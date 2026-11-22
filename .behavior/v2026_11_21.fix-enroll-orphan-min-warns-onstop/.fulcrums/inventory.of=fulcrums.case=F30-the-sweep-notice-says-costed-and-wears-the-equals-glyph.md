# F30 — the sweep's unreadable notice says "could not be costed" and `hint  =`

- **fork**: keep `🟡 a boot spec could not be read` and `└─ hint: repair the spec, …`; or say `could not be costed` and `└─ hint  = repair what the fault names, …`
- **taken**: `costed` and `hint  =`, in `asBootSpecUnreadableLines`
- **why**:
  - the notice fires on any `ConstraintError` the sweep catches per spec. a refused mod (`roles.mods` cases 11.4–11.6) is a spec read whole, then refused, so "could not be read" names the wrong fault. the sweep could not cost it; that is what holds in every case
  - "repair the spec" sends the reader to the spec, while a mod refusal sits in the mod file the fault names. the new hint follows the fault
  - `hint:` is a colon separator in stdout-kind output (`rule.forbid.colons-in-stdout`); the rows above it already read `spec  =` and `fault =`, so `hint  =` aligns them
- **bound**: the notice, its 🟡, its stream, and its exit 0 are unchanged. only two words move
- **rework**: clean. revert the two strings and three snaps
- **confidence**: 85%
- **counter (5.3 i005 r12 blocker.2)**: the mods flows are untouched by the wish; that the old text named the wrong fault is a style preference
- **answer**: the notice is the sweep's, and this pr routes every role spec fault through it or past it (F33). a notice that names the wrong fault tells a reader false facts, which is no style; the two words that move fix it on the one line every caller shares
- **where**: 5.3 peer review i004 r12 blocker.2; i005 r12 blocker.2
- **verdict**: open
