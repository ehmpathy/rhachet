# self-review: has-contract-output-variants-snapped (r5)

## question

did i snap all contract output variants to catch unintended drift?

## analysis: what is the contract surface?

this feature modifies `translateHook.ts` — an internal adapter that converts rhachet `BrainHook` objects to claude code `ClaudeCodeHookEntry` objects. it is not a public contract.

| layer | public? | snapshots applicable? |
|-------|---------|----------------------|
| CLI output | NO — no CLI command touches this code | N/A |
| SDK response | NO — not exported in SDK | N/A |
| API response | NO — no API endpoint | N/A |
| internal adapter | YES — this is what changed | NO — internal transforms |

## why snapshots are not applicable

snapshots serve to catch unintended drift in **user-visible output**:
- CLI help text, status messages, error formats
- SDK return shapes that callers depend on
- API response bodies that clients parse

`translateHook.ts` is an internal adapter. its callers are:
1. `genBrainHooksAdapterForClaudeCode.ts` — internal CRUD operations
2. tests — verification of translation logic

no human or external system observes the output of `translateHookToClaudeCode` directly. the output is written to `.claude/settings.json`, which is a machine-readable config file for claude code — not a user-visible artifact.

## what verification applies instead

for internal adapters, **explicit assertions** serve the role that snapshots serve for public contracts:

| criteria usecase | test case | assertion |
|------------------|-----------|-----------|
| usecase.1 | case5 | `expect(result[0]?.event).toEqual('PostCompact')` |
| usecase.2 | case6 | `expect(result[0]?.event).toEqual('PreCompact')` |
| usecase.3 | case1 | `expect(result[0]?.event).toEqual('SessionStart')` |
| usecase.4 | case7 | `expect(result[0]?.event).toEqual('SessionStart')` |
| usecase.5 | case8 | `expect(result).toHaveLength(3)` + event checks |
| usecase.6 | case9 | `expect(...).toThrow(...)` |

these assertions catch drift in the adapter's behavior with more precision than snapshots would.

## why it holds

snapshots capture **shape and content** of outputs to detect unintended changes. for internal adapters:
- the "output" is a data structure passed to another internal function
- the shape is defined by TypeScript types (`ClaudeCodeHookEntry`)
- the content is verified by explicit assertions

snapshots of internal data structures add maintenance burden (snapshot updates on every refactor) without safety benefit (TypeScript + assertions already verify correctness).

## conclusion

- [x] identified contract surface — internal adapter, not public
- [x] confirmed no CLI/SDK/API outputs to snap
- [x] verified explicit assertions cover all criteria usecases
- [x] explained why snapshots are not the right tool for this layer

**why it holds:** snapshots are for public contracts. this is internal adapter code. explicit assertions verify correctness more precisely than snapshots would.

