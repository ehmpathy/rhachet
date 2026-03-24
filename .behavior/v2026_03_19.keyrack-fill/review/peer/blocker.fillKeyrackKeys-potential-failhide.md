# blocker: fillKeyrackKeys potential failhide in prikey discovery

## severity
blocker (failhide = mega blocker per briefs)

## location
`src/domain.operations/keyrack/fillKeyrackKeys.ts:118-128`

## description

the prikey discovery loop catches `BadRequestError` and continues to the next prikey, but this may hide real errors:

```ts
for (const prikey of input.prikeys) {
  try {
    hostContext = await genKeyrackHostContext({ owner: owner, prikey });
    prikeyFound = prikey;
    break;
  } catch (error) {
    // allow decryption failure (wrong prikey) - try next
    if (error instanceof BadRequestError) continue;
    // propagate other errors (network, permissions, etc)
    throw error;
  }
}
```

## concerns

1. **is BadRequestError the only "wrong prikey" error type?**
   - `genKeyrackHostContext` may throw other error types for decryption failures
   - e.g., age decryption failures, ssh key parse failures, etc.

2. **catch scope is too broad**
   - any BadRequestError is swallowed, not just "wrong prikey" errors
   - could hide legitimate BadRequestErrors from downstream operations

3. **no log of skipped prikeys**
   - if all prikeys fail, user gets generic "no available prikey" error
   - no visibility into which prikeys were tried and why they failed

## recommendation

1. check if `genKeyrackHostContext` throws specific error types for decryption failures
2. if yes, narrow the catch to those specific types
3. if no, consider a specific error type for "prikey cannot decrypt"
4. add debug log for skipped prikeys:

```ts
for (const prikey of input.prikeys) {
  try {
    hostContext = await genKeyrackHostContext({ owner: owner, prikey });
    prikeyFound = prikey;
    break;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    // check for specific decryption failure indicators
    if (isDecryptionFailure(error)) {
      // log.debug for observability
      continue;
    }
    throw error;
  }
}
```

## investigation needed

check what errors `genKeyrackHostContext` -> `daoKeyrackHostManifest.get()` -> age decryption can throw.
