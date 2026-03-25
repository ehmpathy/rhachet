# self-review: has-consistent-mechanisms

## stone
3.3.1.blueprint.product.v1

## question
does the blueprint introduce new mechanisms that duplicate extant functionality?

## review

### isOpCliInstalled.ts

**proposed:** new file to check if `op` cli is installed via `which op` or similar.

**extant pattern:** none found. `execOp` in vaultAdapter1Password.ts wraps `op` calls but has no explicit install check.

**verdict:** new utility, no duplication. clean separation — install check is distinct from command execution.

### promptVisibleInput for exid

**proposed:** blueprint says `promptVisibleInput()` for exid prompt.

**extant pattern:** `promptUser` in `setupAwsSsoWithGuide.ts` does visible input via readline. this is a local helper, not in infra.

**issue found:** blueprint proposes `promptVisibleInput()` but extant pattern is `promptUser` as a local helper. should reuse the extant pattern or extract to infra.

**decision:** at execution time, reuse `promptUser` pattern inline in vaultAdapter1Password.ts (like setupAwsSsoWithGuide.ts does) rather than create a new infra utility. keeps consistency with extant aws sso guided setup.

### vaultAdapterOsDaemon.ts

**proposed:** update extant adapter with EPHEMERAL_SESSION mech.

**extant pattern:** file already exists at `src/domain.operations/keyrack/adapters/vaults/vaultAdapterOsDaemon.ts`. uses `daemonAccessUnlock`, `promptHiddenInput`, `inferKeyGrade`.

**verdict:** update extant file, no duplication.

### vaultAdapter1Password.ts set()

**proposed:** implement set() with exid prompt and roundtrip validation.

**extant pattern:** file already exists. `execOp` wrapper already exists for op cli calls. `isUnlocked` uses `execOp(['whoami'])`. get() uses `execOp(['read', exid])`.

**verdict:** extend extant file and patterns. roundtrip validation via `execOp(['read', exid])` reuses extant `execOp` wrapper.

### genContextKeyrackGrantUnlock.ts

**proposed:** add os.daemon and 1password adapters to vault map.

**extant pattern:** file already has vault adapter map. adds new entries, not new mechanism.

**verdict:** extend extant map, no duplication.

### setKeyrackKey.ts

**proposed:** skip manifest write for os.daemon vault.

**extant pattern:** file already has conditional logic for different vaults.

**verdict:** extend extant conditionals, no duplication.

## issues found

1. **promptVisibleInput** — blueprint says `promptVisibleInput()` but should reuse `promptUser` pattern from setupAwsSsoWithGuide.ts

## fix

update blueprint to clarify: use inline `promptUser` pattern (readline visible input) like setupAwsSsoWithGuide.ts, not a new infra utility.

this is a documentation clarification, not a code change. blueprint already says `[+] promptVisibleInput() for exid` which can be implemented by adopting the `promptUser` pattern inline.

## verdict

one minor clarification: reuse `promptUser` inline pattern, not new infra utility. all other mechanisms are consistent with extant patterns.
