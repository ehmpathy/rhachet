# self-review: role-standards-adherance (r7)

## approach

enumerated rule categories from mechanic briefs, then traced each production file line-by-line against relevant standards.

## rule categories checked

| category | scope |
|----------|-------|
| lang.terms | name conventions (treestruct, ubiqlang, forbid-gerunds, noun_adj) |
| lang.tones | lowercase, no buzzwords, no shouts |
| code.prod/evolvable.procedures | arrow-only, input-context, single-responsibility |
| code.prod/evolvable.repo.structure | directional-deps, no barrels |
| code.prod/pitofsuccess.errors | failfast, failloud, BadRequestError |
| code.prod/pitofsuccess.procedures | idempotent, immutable-vars |
| code.prod/readable.comments | what-why-headers |
| code.prod/readable.narrative | no else, early returns |

## file-by-file review

### invokeRepoCompile.ts (146 lines)

**lang.terms adherance:**

| line | name | pattern | holds? |
|------|------|---------|--------|
| 19 | `invokeRepoCompile` | invoke* for CLI | yes |
| 6 | `getAllArtifactsForRole` | getAll* for enumeration | yes |
| 46-47 | `fromDir`, `intoDir` | clear nouns | yes |

**why it holds:**
- `invokeRepoCompile` follows the exact pattern of other CLI handlers in `src/contract/cli/`: invokeAct, invokeAsk, invokeRepoIntrospect. the verb prefix `invoke` + command name is universal.
- `getAllArtifactsForRole` matches the `getAll*` pattern for enumeration operations (e.g., `getAllKeyrackSlugsForEnv`, `getAllFilesFromDir`).
- `fromDir` and `intoDir` are [noun][adj] ordered: dir is the noun, from/into qualify which dir. not "sourceDir"/"destDir" which would use overloaded terms.

**lang.tones adherance:**

| aspect | holds? | evidence |
|--------|--------|----------|
| lowercase in comments | yes | lines 12-18, 20, 45, 102, 121, 125 |
| no buzzwords | yes | no "robust", "scalable", etc |
| no ALL_CAPS shouts | yes | constants acceptable |

**why it holds:**
- every comment starts lowercase: `.what = adds the "repo compile"` (line 13), `.why = enables rsync-like` (line 14), `// get or create repo command` (line 20).
- no marketing language — the comments describe what the code does, not what it aspires to be.

**code.prod adherance:**

| rule | line | holds? |
|------|------|--------|
| arrow function | 19, 36 | yes |
| jsdoc .what/.why | 12-18 | yes |
| single responsibility | entire file | yes — one command |
| failfast | 49-56, 58-65, 67-70, 78-82, 95-98 | yes |
| BadRequestError for user input | 50, 59, 68, 79, 96 | yes |
| no else branches | entire file | yes |
| directional deps | imports from domain.operations | yes |

**why it holds:**
- arrow functions: `export const invokeRepoCompile = ({ program }: ...): void =>` (line 19) and `async (options: ...) =>` (line 36). no `function` keyword.
- jsdoc header has both `.what` (line 13) and `.why` (line 14) before the export.
- single responsibility: this file does one task — register the `repo compile` command. it does not mix business logic.
- failfast: each validation throws immediately: `if (!fromDir.startsWith(gitRoot)) throw new BadRequestError` (lines 49-56). no deferred error collection.
- BadRequestError for all user-facing errors: invalid paths (lines 50, 59, 68), wrong package name (line 79), no getRoleRegistry (line 96). these are all "caller must fix" situations.
- no else: all branches use early-throw pattern. searched for `} else {` — not present.
- directional deps: contract layer (cli) imports from domain.operations layer. never the reverse.

### getAllArtifactsForRole.ts (136 lines)

**lang.terms adherance:**

| line | name | pattern | holds? |
|------|------|---------|--------|
| 41 | `getAllArtifactsForRole` | getAll* for enumeration | yes |
| 29 | `extractDirUris` | extract* for parse helper | yes |
| 9 | `DEFAULT_ARTIFACT_EXCLUSIONS` | SCREAMING_SNAKE for const | yes |

**why it holds:**
- `getAllArtifactsForRole` follows the getAll* enumeration pattern. the scope suffix `ForRole` matches extant patterns like `getAllKeyrackGrantsByRepo`.
- `extractDirUris` uses extract* for transformers that pull data from a larger structure. it takes `dirs` config and extracts the uri strings.
- `DEFAULT_ARTIFACT_EXCLUSIONS` is a module-level constant, so SCREAMING_SNAKE is correct. this is not an acronym (which would be lowercase per forbid-shouts).

**lang.tones adherance:**

| aspect | holds? | evidence |
|--------|--------|----------|
| lowercase in comments | yes | lines 25-27, 37-39, 49, 65, 85, 105, 109 |
| no buzzwords | yes | none detected |

**why it holds:**
- all comments are lowercase: `.what = extracts uri strings` (line 26), `// briefs from registered dirs` (line 49), `// role-level files (readme, boot, keyrack)` (line 109).
- comments describe the mechanics, not marketing claims.

**code.prod adherance:**

| rule | line | holds? |
|------|------|--------|
| arrow function | 29, 41 | yes |
| jsdoc .what/.why | 25-27, 37-39 | yes |
| single responsibility | entire file | yes — artifact collection |
| failfast | 53-56, 73-76, 93-96 | yes |
| input-context pattern | 41-46 | yes (input object) |
| no else branches | entire file | yes |
| no index.ts barrel | filename | yes |

**why it holds:**
- arrow functions: `const extractDirUris = (...)` (line 29) and `export const getAllArtifactsForRole = async (input: ...)` (line 41). no `function` keyword.
- jsdoc headers: `extractDirUris` has `.what` and `.why` (lines 25-27), `getAllArtifactsForRole` has `.what` and `.why` (lines 37-39).
- single responsibility: this file collects artifacts for one role. it does not manage the copy loop or registry loading.
- failfast: when a briefs/skills/inits dir is declared but not found, it throws immediately (lines 53-56, 73-76, 93-96). the error includes `role` and `dir` metadata for diagnosis.
- input-context: the function takes `input: { role, fromDir, include?, exclude? }` as first arg. no positional arguments.
- no index.ts: the file is `getAllArtifactsForRole.ts`, not `index.ts`. no barrel export.

**note on mutation:** line 47 uses `const artifacts: string[] = []` with push pattern. this is acceptable per rule.require.immutable-vars: the variable binding is immutable (const), mutation is scoped within function, and accumulator patterns are the standard approach.

### getAllFilesByGlobs.ts (59 lines)

**lang.terms adherance:**

| line | name | pattern | holds? |
|------|------|---------|--------|
| 16 | `getAllFilesByGlobs` | getAll* for enumeration | yes |
| 32 | `matchUserExclude` | match* for predicate | yes |
| 44 | `rel` | short but scoped | yes |

**why it holds:**
- `getAllFilesByGlobs` follows getAll* pattern. the suffix `ByGlobs` describes the discovery mechanism, similar to `getAllFilesFromDir` (by traversal).
- `matchUserExclude`, `matchUserInclude`, `matchDefaultExclude` all use match* for predicates that return boolean. these are arrow functions that wrap picomatch.
- `rel` is short but only lives within the filter callback (line 43-57). short names are acceptable when scope is tight.

**lang.tones adherance:**

| aspect | holds? | evidence |
|--------|--------|----------|
| lowercase in comments | yes | lines 6-14, 23, 31, 42, 46, 49, 52, 55 |
| no buzzwords | yes | none detected |

**why it holds:**
- jsdoc is lowercase: `.what = get files by glob patterns` (line 7), `.why = user includes can rescue files` (line 8).
- inline comments are lowercase: `// gather all candidate files (no exclusions yet)` (line 23), `// 1. user exclude → always excludes` (line 46).
- comments describe behavior, not aspirations.

**code.prod adherance:**

| rule | line | holds? |
|------|------|--------|
| arrow function | 16, 32, 34, 35, 37, 38, 40 | yes |
| jsdoc .what/.why | 6-14 | yes |
| single responsibility | entire file | yes — glob discovery |
| no else branches | entire file | yes |
| input-context pattern | 16-21 | yes (input object) |
| infra isolation | no domain imports | yes |

**why it holds:**
- arrow functions: the main export (line 16) and all matcher functions (lines 32-40) are arrow syntax. `const matchUserExclude = input.userExclude.length ? pm(...) : () => false`.
- jsdoc: full `.what`/`.why` block (lines 6-14) with precedence rules documented in detail.
- single responsibility: this file provides glob-based file discovery with precedence. it does not know about roles, artifacts, or compile.
- no else: the filter uses early-return pattern. `if (matchUserExclude(rel)) return false; if (matchUserInclude(rel)) return true; if (matchDefaultExclude(rel)) return false; return true;`. no else branches.
- input-context: function takes `input: { cwd, defaultInclude, defaultExclude, userInclude, userExclude }` as single object.
- infra isolation: the only imports are `fast-glob`, `picomatch`, and `path`. no domain imports. this file belongs in infra layer.

## deviation check

searched for common violations across all three production files:

### gerunds (rule.forbid.gerunds)

searched all variable names, function names, comments for `-ing` as noun.

**result:** no gerunds found.

- variable names use nouns or past participles: `artifacts`, `files`, `candidates`
- function names use verb prefixes: `getAllArtifactsForRole`, `extractDirUris`
- comments use imperative or descriptive: "collect all artifact paths", not "artifact collection"

### else branches (rule.forbid.else-branches)

searched for `} else {` pattern.

**result:** no else branches found.

- invokeRepoCompile.ts: all validation uses `if (!condition) throw`. no else.
- getAllArtifactsForRole.ts: early-throw for validation. no else.
- getAllFilesByGlobs.ts: filter uses sequential `if (x) return` pattern. no else.

### function keyword (rule.require.arrow-only)

searched for `function ` (with trailing space).

**result:** no function keyword in production code.

- all exports use `export const name = (...) =>`
- all internal functions use `const name = (...) =>`
- Commander's .action() receives arrow callback

### as cast (rule.forbid.as-cast)

searched for ` as ` pattern.

**result:** no as casts in production code.

- types flow from typed inputs and typed returns
- no type assertions needed
- the only place ` as ` could appear is in type imports, which is acceptable

### positional args (rule.forbid.positional-args)

checked function signatures for >2 scalar parameters.

**result:** all functions use input object pattern.

- `getAllArtifactsForRole(input: { role, fromDir, include?, exclude? })`
- `getAllFilesByGlobs(input: { cwd, defaultInclude, ... })`
- `extractDirUris(dirs: ...)` — single arg, acceptable

### undefined inputs (rule.forbid.undefined-inputs)

checked input types for optional `?:` patterns.

**result:** only user-facing flags are optional.

- `include?: string[]` and `exclude?: string[]` are CLI flags. users may or may not supply them. this is acceptable at contract boundary.
- internal contracts pass required fields.

## test file review

the three test files (`*.integration.test.ts`) follow test standards:

- use `given/when/then` from test-fns
- use `useBeforeAll` for test data setup
- use `[case#]` and `[t#]` labels for test organization
- assert on observable outputs only (stdout, exit code, file system)
- no mocks, only real execution

## conclusion

all production files adhere to mechanic role standards:

1. **names follow treestruct and ubiqlang patterns**
   - invoke* for CLI handlers
   - getAll* for enumeration
   - extract* for transformers
   - [noun][adj] order maintained

2. **tone is lowercase without buzzwords**
   - every comment checked starts lowercase
   - no marketing language

3. **procedures use arrow functions with input-context pattern**
   - no function keyword
   - all functions take single input object

4. **comments have .what and .why headers**
   - all exported functions have jsdoc with both

5. **error path uses failfast with BadRequestError**
   - validation throws immediately
   - errors include context metadata

6. **no else branches**
   - all control flow uses early-return/early-throw

7. **directional deps maintained**
   - contract imports from domain.operations
   - domain.operations imports from infra
   - infra has no domain imports
