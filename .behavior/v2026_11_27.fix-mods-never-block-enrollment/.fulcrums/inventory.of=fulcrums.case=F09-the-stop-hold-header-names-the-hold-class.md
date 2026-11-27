# F09 — the stop hold header names the class of the hold, not of each member

- **fork**: the stop hold groups every skipped mod under one header, and a member may be a `MalfunctionError` (a corrupt view record). (a) the header names the hold's own class, `✋ ConstraintError`, and each member line keeps its own class · (b) a class-neutral header · (c) a header that lists the classes present
- **taken**: (a). the header is the error the stop raises, and the stop exits 2: a human must act before the clone may stop. `rule.require.qualified-error-headers` maps exit 2 to `✋ ConstraintError`, so the header names the hold truthfully. each member line still opens with its own glyph and class (`💥 MalfunctionError: the modded view record is unreadable`), so no member's class is hidden. a neutral header (b) would break the qualified-header rule; a header of mixed classes (c) would claim one error is two
- **rework**: clean — one line in `asRoleModFaultsHookReadout`, and the stop snapshots
- **confidence**: 80%. a reader may still read the header as the class of every member below it
- **where**: `src/domain.operations/mods/asRoleModFaultsHookReadout.ts`
- **proof**: `asRoleModFaultsHookReadout.test.ts` case2 snapshot (a `💥 MalfunctionError` member under the `✋ ConstraintError` hold)
- **see also**: F15, which settles the words of the same header line (`N mod faults, held until cured`), apart from its class
