# review: has-pruned-backcompat (r2)

## verdict: issue found

## deeper review

Re-read the blueprint CLI contract section:

```
rhx init $brain --hooks [--roles $roles]

positional:
  $brain              brain slug (claude, claude-code) — REQUIRED
```

The blueprint explicitly states `$brain` is **REQUIRED**, not optional.

## issue identified

**Location:** `src/contract/cli/invokeInit.ts:163-174`

```typescript
} else {
  // no brain specified: sync hooks (legacy behavior)
  const brains = ...
  const hookResult = await syncHooksForLinkedRoles({ brains }, context);
}
```

I added this fallback to preserve old `rhx init --hooks` behavior. However:
1. Blueprint says `$brain` is REQUIRED
2. No explicit request to preserve legacy behavior
3. This is assumed backwards compat "to be safe"

## resolution options

**Option A:** Remove legacy fallback (strict blueprint adherence)
- `rhx init --hooks` without brain throws error
- Force users to use `rhx init claude --hooks`

**Option B:** Keep legacy fallback (migration path)
- `rhx init --hooks` continues to sync hooks
- `rhx init claude --hooks` generates brain config
- Requires wisher approval

## question for wisher

Was the legacy `rhx init --hooks` behavior meant to be preserved or replaced?

The blueprint implies replacement, but I preserved it for migration. This needs explicit confirmation.

## action taken

Flagged as open question. No code change made - awaits wisher decision.
