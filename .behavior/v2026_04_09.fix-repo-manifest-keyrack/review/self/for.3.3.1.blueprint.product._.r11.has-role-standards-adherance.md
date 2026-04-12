# self-review r11: has-role-standards-adherance

## rule directories to check

from `repo=ehmpathy/role=mechanic/briefs/practices/`:

1. `lang.terms/` — name conventions, ubiqlang
2. `lang.tones/` — seaturtle vibes
3. `code.prod/evolvable.procedures/` — input-context pattern, arrow functions
4. `code.prod/evolvable.domain.operations/` — get/set/gen verbs
5. `code.prod/readable.narrative/` — narrative flow, no else branches
6. `code.prod/pitofsuccess.errors/` — failfast, failloud

## rule check: input-context pattern

**rule**: `rule.require.input-context-pattern`

**blueprint functions**:

```ts
getAllArtifactsForRole = async (input: { role: Role; fromDir: string; ... })
applyArtifactGlobs = (input: { files: string[]; globs: string[] })
applyExclusions = (input: { artifacts: string[]; defaultExclusions: string[]; ... })
copyFileWithStructure = async (input: { source: string; fromDir: string; intoDir: string })
pruneEmptyDirs = async (input: { dir: string })
```

**why it holds**: all functions use `(input: {...})` pattern. no positional args. context is absent where not needed (transformers are pure).

## rule check: arrow functions

**rule**: `rule.require.arrow-only`

**blueprint**:
```ts
export const getAllArtifactsForRole = async (input: {...}): Promise<string[]> => {
export const applyArtifactGlobs = (input: {...}): string[] => {
export const applyExclusions = (input: {...}): string[] => {
export const copyFileWithStructure = async (input: {...}): Promise<void> => {
export const pruneEmptyDirs = async (input: {...}): Promise<void> => {
```

**why it holds**: all functions use `const name = () => {}` arrow syntax. no `function` keyword.

## rule check: get/set/gen verbs

**rule**: `rule.require.get-set-gen-verbs`

| function | verb | correct? |
|----------|------|----------|
| getAllArtifactsForRole | getAll* | yes — retrieval |
| applyArtifactGlobs | apply* | exception — transformer |
| applyExclusions | apply* | exception — transformer |
| copyFileWithStructure | copy* | exception — imperative action |
| pruneEmptyDirs | prune* | exception — imperative action |

**why it holds**: `getAll*` follows the rule. transformers and imperative actions are exempt from get/set/gen as they represent computation or commands, not data operations.

## rule check: narrative flow

**rule**: `rule.require.narrative-flow`

**blueprint getAllArtifactsForRole structure**:
```
// briefs from registered dirs
for (const dir of extractDirUris(...)) {
  ...
}

// skills from registered dirs
for (const dir of extractDirUris(...)) {
  ...
}

// inits from registered dirs
for (const dir of extractDirUris(...)) {
  ...
}

// role-level files (readme, boot, keyrack)
...

// apply exclusions
...
```

**why it holds**: code is organized into paragraphs with one-line comments. no nested if/else. flat structure.

## rule check: no else branches

**rule**: `rule.forbid.else-branches`

**blueprint**:

Searched for `else` in blueprint: none found.

**why it holds**: blueprint uses early returns and filter/map patterns instead of if/else.

## rule check: failfast

**rule**: `rule.require.failfast`

**blueprint error pattern**:
```ts
if (!fs.existsSync(fullPath)) {
  throw new BadRequestError('briefs dir not found', { role: input.role.name, dir });
}
```

**why it holds**: validation checks throw immediately with BadRequestError and context. no silent failures.

## rule check: failloud

**rule**: `rule.require.failloud`

**blueprint error messages**:
- `'briefs dir not found'` + `{ role, dir }`
- `'skills dir not found'` + `{ role, dir }`
- `'inits dir not found'` + `{ role, dir }`
- `'--from is required'`
- `'--into is required'`
- `'--into must be within repo'` + `{ provided, repo }`
- `'no package.json found'` + `{ expected }`
- `'no .agent/ directory found'` + `{ expected }`
- `'no roles discovered'` + `{ searched }`

**why it holds**: all errors include message + context object. errors explain what went wrong and provide relevant variables.

## rule check: seaturtle vibes

**rule**: `rule.im_an.ehmpathy_seaturtle`

**blueprint output format**:
```
🐢 cowabunga!

🐚 repo compile
   ├─ from: src
   ├─ into: dist
   └─ compiled 25 artifacts from 2 roles
```

**error format**:
```
🐢 bummer dude...

🐚 repo compile
   └─ ✋ blocked: --from is required
```

**why it holds**: uses turtle emoji and vibe phrases (`cowabunga!`, `bummer dude...`). follows treestruct pattern.

## rule check: ubiqlang

**rule**: `rule.require.ubiqlang`

| term | consistent? |
|------|-------------|
| artifacts | yes — used throughout |
| roles | yes — same as codebase |
| compile | yes — matches command name |
| exclusions | yes — standard term |
| globs | yes — standard term |

**why it holds**: no synonym drift. consistent terminology with rest of codebase.

## conclusion

all mechanic standards checked:
- input-context pattern: followed
- arrow functions: followed
- get/set/gen verbs: followed (with valid exceptions)
- narrative flow: followed
- no else branches: followed
- failfast: followed
- failloud: followed
- seaturtle vibes: followed
- ubiqlang: followed

no violations found.
