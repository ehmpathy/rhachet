# self-review: has-pruned-backcompat (r2)

review for backwards compatibility that was not explicitly requested.

---

## assessment

this spike introduces **new functionality** - brain auth pool rotation did not have a prior implementation.

### question: did we assume backwards compat "to be safe"?

no. this is greenfield code. there are no prior versions, no prior consumers, no prior contracts to maintain.

### files reviewed

| file | backcompat concern? | analysis |
|------|---------------------|----------|
| `BrainAuthSpecWords.ts` | no | new type, no prior version |
| `BrainAuthSpecShape.ts` | no | new interface, no prior version |
| `BrainAuthCredential.ts` | no | new domain literal, no prior version |
| `BrainAuthCapacity.ts` | no | new domain literal, no prior version |
| `BrainAuthSupplied.ts` | no | new domain literal, no prior version |
| `BrainAuthError.ts` | no | new domain literal, no prior version |
| `BrainAuthCapacityDao.ts` | no | new interface, no prior version |
| `BrainAuthAdapterDao.ts` | no | new interface, no prior version |
| `BrainAuthAdapter.ts` | no | new interface, no prior version |
| `asBrainAuthSpecShape.ts` | no | new transformer, no prior version |
| `asBrainAuthTokenSlugs.ts` | no | new transformer, no prior version |
| `genApiKeyHelperCommand.ts` | no | new transformer, no prior version |
| `getBrainAuthCapacityForAnthropic.ts` | no | new communicator, no prior version |
| `getBrainAuthCredentialForAnthropic.ts` | no | new communicator, no prior version |
| `genBrainAuthAdapterForClaudeCode.ts` | no | new adapter factory, no prior version |
| `getOneBrainAuthCredentialBySpec.ts` | no | new orchestrator, no prior version |
| `invokeBrainsAuth.ts` | no | new CLI command group, no prior version |

### invoke.ts modification

the change to `invoke.ts` is additive only:
- added import for `invokeBrainsAuth`
- added registration call `invokeBrainsAuth({ program })`
- no prior behavior modified
- no prior commands removed or altered

---

## conclusion

no backwards compatibility concerns found.

this is greenfield code with zero prior versions to maintain compatibility with.

the wisher did not request backwards compatibility because there is no prior implementation to be compatible with.

