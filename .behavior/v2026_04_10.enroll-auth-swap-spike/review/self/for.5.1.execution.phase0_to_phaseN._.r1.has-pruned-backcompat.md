# self-review: has-pruned-backcompat

review for backwards compatibility that was not explicitly requested.

---

## assessment

this spike introduces **new functionality** - no prior auth rotation existed.

### components reviewed

| component | backcompat concern? | notes |
|-----------|---------------------|-------|
| BrainAuth* domain objects | no | new types, no prior versions |
| invokeBrainsAuth CLI | no | new command group (`brains auth`) |
| genBrainAuthAdapterForClaudeCode | no | new adapter |
| getOneBrainAuthCredentialBySpec | no | new orchestrator |

### invoke.ts modification

added `invokeBrainsAuth({ program })` registration - additive only, no prior behavior modified.

---

## conclusion

no backwards compatibility concerns found.

this is greenfield code with no prior version to maintain compatibility with.
