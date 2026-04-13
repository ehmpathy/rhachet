# review: has-consistent-conventions (round 3)

## slowed down. tea in hand. fresh perspective.

let me examine each name choice against extant conventions.

## name choices examined

### 1. `promptLineInput`

extant pattern:
- `promptHiddenInput` — prompt + Hidden + Input

new name:
- `promptLineInput` — prompt + Line + Input

**follows pattern?** yes. `prompt*Input` pattern. `Line` describes behavior (reads one line), just as `Hidden` describes behavior (hides echo).

### 2. `genMockPromptLineInput`

extant pattern:
- `genMockPromptHiddenInput` — genMock + PromptHiddenInput

new name:
- `genMockPromptLineInput` — genMock + PromptLineInput

**follows pattern?** yes. `genMock*` prefix for mock generators.

### 3. `setMockPromptLineValues`

extant pattern:
- `setMockPromptValues` — setMock + Prompt + Values

new name:
- `setMockPromptLineValues` — setMock + PromptLine + Values

**follows pattern?** yes. `setMock*Values` for queue setters. `Line` distinguishes from hidden queue.

### 4. `clearMockPromptLineValues`

extant pattern:
- `clearMockPromptValues` — clearMock + Prompt + Values

new name:
- `clearMockPromptLineValues` — clearMock + PromptLine + Values

**follows pattern?** yes. `clearMock*Values` for queue clearers.

## file location consistency

extant:
- `src/infra/promptHiddenInput.ts`
- `src/.test/infra/mockPromptHiddenInput.ts`

new:
- `src/infra/promptLineInput.ts`
- `src/.test/infra/mockPromptLineInput.ts`

**follows pattern?** yes. same directory structure. same file name pattern.

## import consistency

extant test pattern:
```ts
import { genMockPromptHiddenInput, setMockPromptValues } from '@src/.test/infra/mockPromptHiddenInput';
jest.mock('@src/infra/promptHiddenInput', () => genMockPromptHiddenInput());
```

new test pattern:
```ts
import { genMockPromptLineInput, setMockPromptLineValues } from '@src/.test/infra/mockPromptLineInput';
jest.mock('@src/infra/promptLineInput', () => genMockPromptLineInput());
```

**follows pattern?** yes. same import structure. same mock registration.

## no new terms introduced

| term | extant | new |
|------|--------|-----|
| prompt | yes | reused |
| Input | yes | reused |
| genMock | yes | reused |
| setMock | yes | reused |
| clearMock | yes | reused |
| Values | yes | reused |
| Line | no | introduced (describes behavior) |

`Line` is the only new term. it describes what the function does (reads one line). this parallels `Hidden` which describes what `promptHiddenInput` does (hides echo).

## verdict

**holds** — all names follow extant conventions. file locations match. import patterns match. the only new term (`Line`) follows the same pattern as extant terms (`Hidden`).

