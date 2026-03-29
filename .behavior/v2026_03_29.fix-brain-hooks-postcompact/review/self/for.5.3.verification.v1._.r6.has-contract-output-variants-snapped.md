# self-review: has-contract-output-variants-snapped (r6)

## question

did i snap all contract output variants to catch unintended drift?

## methodical examination: what files were modified?

i ran `git diff main --name-only` to see all source file changes:

```
src/_topublish/rhachet-brains-anthropic/src/hooks/translateHook.ts
src/_topublish/rhachet-brains-anthropic/src/hooks/translateHook.test.ts
src/_topublish/rhachet-brains-anthropic/src/hooks/genBrainHooksAdapterForClaudeCode.ts
src/_topublish/rhachet-brains-anthropic/src/hooks/config.dao.ts
```

these are the only source files modified (other than .behavior/, readme.md, etc).

## contract surface analysis

### step 1: check if any modified files are in src/contract/

i ran `Glob pattern: src/contract/**/*.ts` and compared against modified files.

**result:** none of the modified files are in `src/contract/`. they are all in `src/_topublish/rhachet-brains-anthropic/src/hooks/`.

### step 2: check if modified files are exported via SDK

i ran `Grep pattern: translateHook|genBrainHooksAdapter|config\.dao` in `src/contract/`.

**result:** only type imports in test files:
```
src/contract/cli/invokeEnroll.acceptance.test.ts:4:import type { ClaudeCodeSettings } from ...
src/contract/cli/invokeEnroll.integration.test.ts:4:import type { ClaudeCodeSettings } from ...
```

these are **type imports for test setup** — not public SDK exports.

### step 3: check SDK brain exports

i read `src/contract/sdk.brains.ts` to see what the public SDK exports:

```ts
export { BrainHook } from '@src/domain.objects/BrainHook';
export type { BrainHookEvent } from '@src/domain.objects/BrainHookEvent';
export type { BrainHookFilter } from '@src/domain.objects/BrainHookFilter';
export type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
```

the SDK exports **types and domain objects** — not the internal implementation files (`translateHook.ts`, `genBrainHooksAdapterForClaudeCode.ts`).

## classification of each modified file

| file | layer | public contract? | snapshots needed? |
|------|-------|------------------|-------------------|
| translateHook.ts | internal adapter | NO | NO |
| translateHook.test.ts | test | NO | NO |
| genBrainHooksAdapterForClaudeCode.ts | internal adapter | NO | NO |
| config.dao.ts | internal DAO | NO | NO |

**why none are public contracts:**
- **CLI:** no new/modified CLI commands. the feature changes internal adapter logic, not CLI output.
- **SDK:** the SDK exports domain object types (`BrainHook`, `BrainHookFilter`), not the adapter implementation.
- **API:** no API endpoints in this codebase.

## why snapshots are not applicable

snapshots serve to catch drift in **caller-visible output**:
- CLI: stdout/stderr that humans read
- SDK: return values that callers depend on
- API: response bodies that clients parse

the modified files produce **internal data structures** passed to other internal functions:
- `translateHookToClaudeCode` returns `Array<{ event: string; entry: ClaudeCodeHookEntry }>` used by `genBrainHooksAdapterForClaudeCode`
- the final output is written to `.claude/settings.json` — a machine-readable config, not a user-visible artifact

## what verification applies instead

for internal adapters, **explicit assertions** and **TypeScript types** provide verification:

1. **TypeScript types** — `ClaudeCodeHookEntry` type enforces shape
2. **explicit assertions** — 44 test cases verify exact expected values
3. **test coverage** — all 6 criteria usecases have dedicated tests

| criteria usecase | test case | assertion |
|------------------|-----------|-----------|
| usecase.1 | case5 | `expect(result[0]?.event).toEqual('PostCompact')` |
| usecase.2 | case6 | `expect(result[0]?.event).toEqual('PreCompact')` |
| usecase.3 | case1 | `expect(result[0]?.event).toEqual('SessionStart')` |
| usecase.4 | case7 | `expect(result[0]?.event).toEqual('SessionStart')` |
| usecase.5 | case8 | `expect(result).toHaveLength(3)` + event checks |
| usecase.6 | case9 | `expect(...).toThrow(...)` |

## conclusion

- [x] examined all modified source files via `git diff main --name-only`
- [x] verified none are in `src/contract/` (not public CLI/SDK/API)
- [x] verified SDK exports only types, not implementation
- [x] confirmed no CLI output changes (no new/modified commands)
- [x] confirmed no SDK return value changes (types unchanged)
- [x] explained why internal adapter data structures don't need snapshots

**why it holds:** this feature modifies internal adapter code, not public contracts. the modified files are in `src/_topublish/.../hooks/`, not `src/contract/`. the SDK exports domain object types, not the adapter implementation. snapshots are not applicable because there is no user-visible output to capture.

