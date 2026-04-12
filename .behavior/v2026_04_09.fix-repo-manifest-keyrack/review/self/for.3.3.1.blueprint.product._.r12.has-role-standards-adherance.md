# self-review r12: has-role-standards-adherance

## summary

second-pass verification of mechanic role standards. confirms all rules from `repo=ehmpathy/role=mechanic/briefs/practices/` are followed.

## rule categories checked

from mechanic briefs, 10 rule categories apply to this blueprint:

1. `code.prod/evolvable.domain.operations/` — domain-operation-grains
2. `code.prod/readable.narrative/` — no decode-friction in orchestrators
3. `code.prod/evolvable.repo.structure/` — directional-deps, no barrel exports
4. `code.prod/evolvable.procedures/` — single-responsibility
5. `code.test/scope.coverage/` — test coverage by grain
6. `code.prod/readable.comments/` — what-why headers
7. `lang.tones/` — treestruct output, lowercase
8. `code.prod/pitofsuccess.procedures/` — immutable vars

## verification by category

### 1. domain-operation-grains

**rule**: operations classified as transformer, communicator, or orchestrator.

| function | grain | why |
|----------|-------|-----|
| getAllArtifactsForRole | orchestrator | composes extractDirUris + getAllFilesFromDir + applyArtifactGlobs + applyExclusions |
| applyArtifactGlobs | transformer | pure filter, no i/o |
| applyExclusions | transformer | pure filter, no i/o |
| copyFileWithStructure | communicator | fs.mkdir + fs.copyFile (i/o boundary) |
| pruneEmptyDirs | communicator | fs.readdir + fs.rmdir (i/o boundary) |

**verdict**: all operations correctly classified.

### 2. no decode-friction in orchestrators

**rule**: orchestrators must read as narrative, no inline decode logic.

**getAllArtifactsForRole check**:
- line 83: `extractDirUris(input.role.briefs?.dirs)` — named operation
- line 88: `getAllFilesFromDir({ dirPath: fullPath })` — named operation
- line 89: `applyArtifactGlobs({ files, globs })` — named operation
- line 131: `applyExclusions({ artifacts, ... })` — named operation

no inline `.filter().map()` chains. no positional array access. no regex. all logic delegated to named operations.

**verdict**: no decode-friction.

### 3. directional-deps

**rule**: lower layers must not import from higher layers.

| layer | imports from | valid? |
|-------|--------------|--------|
| invokeRepoCompile (contract) | domain.operations | yes |
| getAllArtifactsForRole (domain.operations) | domain.objects, infra | yes |
| applyArtifactGlobs (domain.operations) | fast-glob only | yes |
| applyExclusions (domain.operations) | fast-glob only | yes |
| copyFileWithStructure (domain.operations) | fs, path | yes |
| pruneEmptyDirs (domain.operations) | fs, path | yes |

no upward imports. no circular deps.

**verdict**: directional-deps followed.

### 4. no barrel exports

**rule**: no index.ts re-exports except for dao entry points.

blueprint creates new files:
- `getAllArtifactsForRole.ts` — single export
- `applyArtifactGlobs.ts` — single export
- `applyExclusions.ts` — single export
- `copyFileWithStructure.ts` — single export
- `pruneEmptyDirs.ts` — single export

no index.ts in `domain.operations/compile/`.

**verdict**: no barrel exports.

### 5. single-responsibility

**rule**: each file exports one procedure, filename matches procedure name.

| file | export | match? |
|------|--------|--------|
| getAllArtifactsForRole.ts | getAllArtifactsForRole | yes |
| applyArtifactGlobs.ts | applyArtifactGlobs | yes |
| applyExclusions.ts | applyExclusions | yes |
| copyFileWithStructure.ts | copyFileWithStructure | yes |
| pruneEmptyDirs.ts | pruneEmptyDirs | yes |

each procedure does one task:
- getAllArtifactsForRole: collect artifacts for one role
- applyArtifactGlobs: filter files by glob patterns
- applyExclusions: apply exclusion logic
- copyFileWithStructure: copy one file
- pruneEmptyDirs: remove empty dirs

**verdict**: single-responsibility followed.

### 6. test coverage by grain

**rule**: transformers get unit tests, orchestrators/communicators get integration tests, contracts get acceptance + snapshots.

| function | grain | test type | location |
|----------|-------|-----------|----------|
| applyArtifactGlobs | transformer | unit | applyArtifactGlobs.test.ts |
| applyExclusions | transformer | unit | applyExclusions.test.ts |
| getAllArtifactsForRole | orchestrator | integration | getAllArtifactsForRole.integration.test.ts |
| copyFileWithStructure | communicator | integration | copyFileWithStructure.integration.test.ts |
| pruneEmptyDirs | communicator | integration | pruneEmptyDirs.integration.test.ts |
| invokeRepoCompile | contract | acceptance + snapshots | repo.compile.acceptance.test.ts |

**verdict**: test coverage by grain followed.

### 7. what-why headers

**rule**: every procedure has `.what` and `.why` jsdoc.

blueprint shows headers for each function:

```ts
/**
 * .what = collect all artifact paths for a single role
 * .why = centralize artifact discovery logic
 */
export const getAllArtifactsForRole = ...

/**
 * .what = filter files by glob patterns
 * .why = select only artifact files from a directory
 */
export const applyArtifactGlobs = ...

/**
 * .what = filter artifacts by exclusion and inclusion patterns
 * .why = honor default exclusions and user overrides
 */
export const applyExclusions = ...

/**
 * .what = copy file to dest with structure intact
 * .why = maintain directory structure in dist/
 */
export const copyFileWithStructure = ...

/**
 * .what = remove empty directories recursively
 * .why = match rsync --prune-empty-dirs behavior
 */
export const pruneEmptyDirs = ...
```

**verdict**: what-why headers present.

### 8. treestruct output

**rule**: CLI output uses turtle vibes treestruct format.

success output (blueprint lines 309-316):
```
🐢 cowabunga!

🐚 repo compile
   ├─ from: src
   ├─ into: dist
   └─ compiled 25 artifacts from 2 roles
```

error output (blueprint lines 324-331):
```
🐢 bummer dude...

🐚 repo compile
   └─ ✋ blocked: --from is required
```

uses 🐢, 🐚, ├─, └─, vibe phrases.

**verdict**: treestruct output followed.

### 9. lowercase

**rule**: prose uses lowercase except for code constructs and proper nouns.

checked blueprint prose:
- "collect all artifact paths for a single role" — lowercase
- "filter files by glob patterns" — lowercase
- "copy file to dest with structure intact" — lowercase

**verdict**: lowercase followed.

### 10. immutable vars

**rule**: use const, no mutation of inputs.

blueprint code patterns:
- `const artifacts: string[] = []` — const binding
- `artifacts.push(...)` — array mutation on local, not input
- `const filtered = applyExclusions(...)` — const binding
- `const relativePath = path.relative(...)` — const binding
- `const destPath = path.join(...)` — const binding

no reassignment. no input mutation. arrays built via push on local const (allowed pattern).

**verdict**: immutable vars followed.

## conclusion

all 10 mechanic rule categories verified:

1. domain-operation-grains: correct classification
2. no decode-friction: all logic in named operations
3. directional-deps: no upward imports
4. no barrel exports: no index.ts
5. single-responsibility: one export per file
6. test coverage by grain: correct test types
7. what-why headers: all present
8. treestruct output: turtle vibes format
9. lowercase: followed
10. immutable vars: const throughout

no violations found.
