# review: has-pruned-backcompat (round 2)

## re-examined with fresh eyes

i slowed down and re-read the code diffs line by line.

## KeyrackKeySpec.ts

```diff
- mech: KeyrackGrantMechanism;
+ mech: KeyrackGrantMechanism | null;
```

**backwards compat concern?** no.

type widened from `KeyrackGrantMechanism` to `KeyrackGrantMechanism | null`. old code that passes a concrete mech value still compiles and runs. null is additive.

no shim added. no fallback. no "if null then default to X" in the type itself.

## hydrateKeyrackRepoManifest.ts

```diff
  keys[slug] = new KeyrackKeySpec({
    slug,
-   mech: 'PERMANENT_VIA_REPLICA',
+   mech: null,
```

**backwards compat concern?** no - this is the fix.

old behavior: always hardcoded PERMANENT_VIA_REPLICA, so vault never prompted.
new behavior: null mech lets vault adapter prompt "which mechanism?"

this is intentional behavior change, not a compat break to protect against.

could have done: `mech: config.legacyBehavior ? 'PERMANENT_VIA_REPLICA' : null`
did not do: because memory says "zero backcompat - just delete"

## inferKeyrackMechForSet.ts

internal implementation changed from raw readline to `promptLineInput`. external API unchanged. no compat concern.

## new files

`promptLineInput.ts` and `mockPromptLineInput.ts` are additive. no compat concern.

## verdict

**holds** - zero backwards compat shims. behavior change is the goal. followed memory guidance.
