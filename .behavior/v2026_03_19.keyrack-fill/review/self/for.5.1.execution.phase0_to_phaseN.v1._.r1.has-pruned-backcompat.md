# review.self: has-pruned-backcompat

## verdict: pass

no unnecessary backwards compatibility code found.

## review

### keyrack fill is new

`keyrack fill` is a new command. it does not replace or modify any extant command. no backwards compat needed.

### vault adapter interface change

the `KeyrackHostVaultAdapter.set()` interface changed: `secret` parameter was removed. vaults now fetch secrets themselves via stdin.

**is this a backcompat concern?**

no. this change was explicitly requested:
- "vaults must fetch their own secrets via stdin - callers never supply secrets"
- this is an architectural principle, not a backwards compat shim

the change was intentional and required. no backcompat code was added "to be safe."

### no deprecated patterns

- no `// TODO: remove after X`
- no optional parameters for "old way" callers
- no shim functions
- no fallback paths

## conclusion

no backwards compatibility code was added. the implementation is forward-only.
