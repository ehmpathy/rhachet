# domain.term: marker

term.chosen   = marker
term.kind     = noun
term.synonyms.forbidden:
- pattern
- signature
- token
- indicator
- matcher

## .what
a shape an emitter is known to PRINT, matched to recognize the fault that emitted it.

## .refs
- src/domain.operations/clone/pty/getPtyModuleOrNull.ts   # PTY_ADDON_LOAD_MARKERS
- src/.test/assets/hostSpecificShellTokens.ts             # the kin list, matched the same way
- src/utils/matchesAnyMarker.ts                           # the quantifier every marker list shares
- src/domain.operations/upgrade/asNpmInstallFailureKind.ts  # PACKAGE_ABSENT_MARKERS, PERMISSION_DENIED_MARKERS

## ⚠️ .the boundary — a marker is INBOUND, a glyph is OUTBOUND

`term=glyph` names the mirror concept: a mark WE print for a human. a marker is a shape THEY
print, which we match. one stem would collapse the two directions — see that cluster's
`.the neighbors this cluster keeps apart`.

## .reason
see the ref-level cluster beside this choice:
- `term=marker._.choice.reason.md` — etymology, the anchored-shape rule, evidence
