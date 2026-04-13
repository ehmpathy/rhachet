# review: has-pruned-backcompat (round 3)

## slowed down. tea in hand. fresh perspective.

let me question all of it again.

## what would backwards compat look like here?

if i were to add backwards compat, it would look like:

```typescript
// hypothetical backcompat shim
const mech = config.preserveLegacyBehavior
  ? 'PERMANENT_VIA_REPLICA'  // old behavior
  : null;                     // new behavior
```

or:

```typescript
// hypothetical fallback
const mech = keySpec?.mech ?? 'PERMANENT_VIA_REPLICA';  // default to old behavior
```

**did i add such a shim?** no.

## walked through each file

### KeyrackKeySpec.ts

read the diff:
```diff
- mech: KeyrackGrantMechanism;
+ mech: KeyrackGrantMechanism | null;
```

this is a type expansion. TypeScript allows `string | null` to accept both `string` and `null`. old code that passes `'PERMANENT_VIA_REPLICA'` still works.

**is this backwards compat?** no. this is an API expansion. compat would be: keep the old non-nullable type AND add a new nullable field.

### hydrateKeyrackRepoManifest.ts

read the diff:
```diff
- mech: 'PERMANENT_VIA_REPLICA',
+ mech: null,
```

**does this break callers?** callers now receive `mech: null` instead of `mech: 'PERMANENT_VIA_REPLICA'`.

**is this the goal?** yes. the wish was to enable mech prompts like `set` does.

**would compat help?** no. compat would preserve the hardcoded mech, which defeats the purpose.

### inferKeyrackMechForSet.ts

internal implementation detail. no external API change. not a compat concern.

### new files

additive. not a compat concern.

## what i did NOT add

- no `config.legacyMode` flag
- no environment variable override
- no fallback to old behavior
- no deprecation notice
- no migration path

## why this is correct

memory guidance: "zero backcompat - just delete"

the old behavior (hardcoded mech) was a bug, not a feature. to preserve it would be harmful.

## verdict

**holds** - examined each file. no backwards compat shims present. behavior change is intentional and desirable.
