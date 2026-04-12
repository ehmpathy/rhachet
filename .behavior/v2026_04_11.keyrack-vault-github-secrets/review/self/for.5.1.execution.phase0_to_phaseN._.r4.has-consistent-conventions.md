# self-review: has-consistent-conventions (r4)

## verdict: holds

deeper comparison with aws.config vault adapter. all conventions align.

## import order

| position | aws.config | github.secrets |
|----------|------------|----------------|
| 1st | helpful-errors | helpful-errors |
| 2nd | @src/* types | @src/* types |
| 3rd | @src/* operations | @src/* operations |
| 4th | node:* | local imports |

**verdict:** both follow external → @src → local/node pattern

## getMechAdapter pattern

compared line-by-line:

```ts
// aws.config
const getMechAdapter = (
  mech: KeyrackGrantMechanism,
): KeyrackGrantMechanismAdapter => {
  const adapters: Partial<
    Record<KeyrackGrantMechanism, KeyrackGrantMechanismAdapter>
  > = { ... };
  const adapter = adapters[mech];
  if (!adapter) {
    throw new UnexpectedCodePathError(`no adapter for mech: ${mech}`, { mech });
  }
  return adapter;
};

// github.secrets — identical structure
```

**verdict:** identical structure, same error handle, same jsdoc format

## jsdoc comment style

both use consistent format:

| element | pattern | example |
|---------|---------|---------|
| .what | one-line purpose | `.what = lookup mech adapter by mechanism name` |
| .why | one-line reason | `.why = vault needs to call mech.acquireForSet for guided setup` |
| .note | additional context | `.note = uses gh secret set under the hood` |

**verdict:** jsdoc format matches established pattern

## export pattern

| vault | export statement |
|-------|------------------|
| aws.config | `export const vaultAdapterAwsConfig: KeyrackHostVaultAdapter` |
| github.secrets | `export const vaultAdapterGithubSecrets: KeyrackHostVaultAdapter` |

**verdict:** both export single typed const

## error handle

| aspect | aws.config | github.secrets |
|--------|------------|----------------|
| error class | UnexpectedCodePathError | UnexpectedCodePathError |
| metadata | `{ mech }` | `{ mech, supported, hint }` |
| hints | yes | yes |

**verdict:** both use same error class with helpful metadata

## method order

| position | aws.config | github.secrets |
|----------|------------|----------------|
| 1 | mechs.supported | mechs.supported |
| 2 | isUnlocked | isUnlocked |
| 3 | unlock | unlock |
| 4 | get | get |
| 5 | set | set |
| 6 | del | del |
| 7 | relock | — |

**verdict:** same order. github.secrets lacks relock (appropriate — no session to clear)

## set method pattern

both follow same flow:

1. infer mech if not supplied
2. check mech compat
3. acquire source via mech adapter
4. perform vault-specific operation
5. return `{ mech, exid }`

**verdict:** set method follows established pattern

## context parameter difference (justified)

| vault | context param | why |
|-------|---------------|-----|
| aws.config | none | reads from user's homedir (~/.aws/config) |
| github.secrets | ContextKeyrack | needs gitroot to find package.json for repo |

**verdict:** difference is appropriate — context supplied where needed

## communicator file pattern

| vault | communicators |
|-------|---------------|
| 1password | execOp.ts, isOpCliInstalled.ts |
| github.secrets | ghSecretSet.ts, ghSecretDelete.ts |

**verdict:** separate communicator files is established pattern

## no divergence found

all conventions verified against aws.config and other vault adapters.

