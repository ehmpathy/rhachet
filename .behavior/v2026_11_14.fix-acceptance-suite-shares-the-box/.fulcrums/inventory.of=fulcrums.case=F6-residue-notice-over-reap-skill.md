# F6 — pre-fix residue gets a notice, not a reap skill

- **the fork**: case 8 (a box dirty from runs before the fix) — build a repo-local reap skill, or print a one-line notice and let each crew clear the pile once by hand (vision Q4, open to the wisher)
- **taken**: a notice in globalSetup that counts `rhachet-test-*` dirs in the os temp root and this checkout's brain stubs older than 30 min, and names a cure: the dirs are safe to delete, a reboot clears the stubs
- **why**: no run of today adds to the pile, so it is a one-time cost. a reap skill would end processes found by a cmdline match, which `rule.forbid.unscoped-process-kills` bars as a class; the notice proposes no kill. a stub older than the new 20 min cap must predate the fix, so the age bound keeps a live run's stubs out of the count
- **rework**: clean — the notice is one file (`emitResidueNotice.ts`); a reap skill would sit beside it and the notice would name it
- **confidence**: 80% — the wisher may still want the reap, if crews do not act on a notice
- **where**: `blackbox/.test/infra/emitResidueNotice.ts`, `getOneResidueFromBefore.ts`; vision case 8, Q4
- **verdict**: confirmed (director, 2026-11-16) — pre-fix residue gets a notice, not a reap skill
