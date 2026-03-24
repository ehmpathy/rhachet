# review.self: has-pruned-backcompat (r2)

## verdict: pass

no backwards compatibility code was added that wasn't explicitly requested.

## detailed review

### scope examined

| file | lines | purpose |
|------|-------|---------|
| fillKeyrackKeys.ts | 1-241 | new orchestrator |
| invokeKeyrack.ts | 1192-1229 | new CLI subcommand |
| setKeyrackKey.ts | 1-65 | extant operation, called by fill |
| setKeyrackKeyHost.ts | 1-142 | extant operation, called by setKeyrackKey |
| vaultAdapterOsSecure.ts | 1-218 | vault adapter interface |
| vaultAdapterOsDirect.ts | 1-173 | vault adapter interface |

### analysis by component

#### 1. fillKeyrackKeys.ts (new file)

**is this backwards compat?** no.

this is a brand new orchestrator. it doesn't replace any extant command. there are no deprecated parameters, no shim functions, no "old way" fallbacks.

**code inspected:**
- input interface (lines 37-43): all new parameters (`env`, `owners`, `prikeys`, `key`, `refresh`)
- no optional parameters for "old API callers"
- no fallback paths for deprecated usage patterns

#### 2. invokeKeyrack CLI subcommand (lines 1192-1229)

**is this backwards compat?** no.

the `keyrack fill` subcommand is entirely new. it doesn't modify any extant subcommand. the command interface is:

```
--env <env>           required
--owner <owner...>    optional, defaults to ['default']
--prikey <path...>    optional
--key <key>           optional
--refresh             optional flag
```

no deprecated flags, no "legacy mode" options, no backward compat aliases.

#### 3. vault adapter interface change

**observation:** the vault adapters' `set()` methods prompt for secrets via stdin:

```ts
// vaultAdapterOsSecure.ts:155-157
const secret = await promptHiddenInput({
  prompt: `enter secret for ${input.slug}: `,
});
```

**is this backwards compat?** no.

this is the current design, not a compat shim. the vision explicitly states:
> "stdout within stdout — fill wraps each `keyrack set` invocation's full stdout within a treebucket"

vaults prompting for their own secrets is the intended interactive behavior.

#### 4. unused `secret` parameter in setKeyrackKey/setKeyrackKeyHost

**observation:** both functions have `secret?: string | null` in their interfaces:
- setKeyrackKey.ts:25
- setKeyrackKeyHost.ts:33

the `secret` is passed down from setKeyrackKey to setKeyrackKeyHost, but setKeyrackKeyHost **never passes it to the vault adapter**. the vault always prompts via stdin regardless.

**is this backwards compat?** no.

this parameter predates `keyrack fill`. it's part of the extant keyrack set API. examining its usage:
- setKeyrackKeyHost receives `input.secret` (line 33)
- but adapter.set() (lines 61-72) does not include `secret` in its call

this is either:
- intentional design: vaults always prompt interactively, `secret` param reserved for future automation
- or: dead code in the set flow

either way, this is **not backwards compat code added for keyrack fill**. it's pre-extant interface structure.

**recommendation:** flag for separate review (not blocking for this behavior route). if it's unused, could be removed in a future cleanup. not introduced by keyrack fill.

#### 5. prikey discovery flow

**code inspected:** fillKeyrackKeys.ts lines 118-141

```ts
// try supplied prikeys first
for (const prikey of input.prikeys) {
  try {
    hostContext = await genKeyrackHostContext({ owner: owner, prikey });
    prikeyFound = prikey;
    break;
  } catch { /* try next */ }
}

// fall back to DAO discovery
if (!hostContext) {
  hostContext = await genKeyrackHostContext({ owner: owner, prikey: null });
}
```

**is this backwards compat?** no.

this is new functionality following the vision:
> "prikey auto-selection — figures out which prikey works for which owner"

the fallback to DAO discovery (prikey: null) is feature design, not compat.

### patterns NOT found

| anti-pattern | found? |
|--------------|--------|
| `// TODO: remove after X` | no |
| `@deprecated` annotations | no |
| optional params for "old callers" | no |
| shim functions | no |
| fallback paths for deprecated behavior | no |
| multiple code paths for same operation (old vs new) | no |
| feature flags for "legacy mode" | no |
| re-exports for backwards compat | no |

## conclusion

no backwards compatibility code was introduced by keyrack fill.

the `secret` parameter in setKeyrackKey/setKeyrackKeyHost predates this work and is outside the scope of this behavior route. if it's unused, that's a separate cleanup concern.

the implementation is forward-only with no compat shims.
