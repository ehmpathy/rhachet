# F12 — a sync over a corrupt manifest stays out of this pr

## .the fork
vision case=8 [t2] says a human recovers from a corrupt manifest with `rhx init --hooks`. measured: that
sync exits 1 on the same read (`hook dispatch manifest row is malformed`). the human must remove the
file first.
- a: make the sync read an unreadable manifest as empty and rewrite it, in this pr
- b: prove the recovery a human has today (remove the file, then sync) and catch the cure as a dream

## .taken = b, why
the sync's manifest read is pre-extant and untouched by this pr; main refuses the same way. the cure
spans three readers and decides the fate of unreadable rows (a foreign row is lost). that is a design
call, outside the wire shape the wish bounds. [case2] [t2] proves both refusals name the fix and that
the talk exits 1. [t3] proves remove-then-sync restores the wire with no settings write.

## .rework = dirty, why
three readers (`genBrainHooksAdapterViaDispatchManifest`, `setHookDispatchManifestRederived`,
`setHookDispatchManifestMigratedFromSettings`) share the read, and each init suite that pins the
refusal text moves.

## .confidence = 75%, why
the `*` wire widens the refusal from the union's tools to every tool. so this pr makes a pre-extant
loop costlier, and the director may want the cure here. the refusal's hint also over-promises.

## .where
`src/domain.operations/brains/dispatch/genBrainHooksAdapterViaDispatchManifest.ts:34`;
dream `.dream/v2026_11_27.fix.hook-sync-refuses-a-corrupt-manifest.md`
