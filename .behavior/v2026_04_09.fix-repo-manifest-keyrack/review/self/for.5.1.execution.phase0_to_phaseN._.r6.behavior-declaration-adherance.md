# self-review: behavior-declaration-adherance (r6)

## approach

compared implementation against:
1. vision (1.vision.yield.md) — the outcome world and user experience
2. criteria (2.1.criteria.blackbox.yield.md) — the usecases and error cases
3. blueprint (3.3.1.blueprint.product.yield.md) — the code structure

## vision adherance

### vision: "rhachet owns the knowledge of what role artifacts matter"

**check:** are default includes centralized in rhachet?

**traced:** `getAllArtifactsForRole.ts` lines 19-23:
```ts
const DEFAULT_ARTIFACT_INCLUSIONS = {
  briefs: ['**/*.md', '**/*.min'],
  skills: ['**/*.sh', '**/*.jsonc', '**/template/**', '**/templates/**'],
  inits: ['**/*.sh', '**/*.jsonc'],
};
```

**holds:** yes. role authors do not specify these globs. rhachet defines them. when rhachet adds a new artifact type, role packages get it automatically.

### vision: "symmetry with rhachet repo introspect"

**check:** does compile use same discovery logic as introspect?

**traced:** both use `getRoleRegistry` export from package entry point:
- invokeRepoCompile.ts line 92-93: `packageExports.getRoleRegistry()`
- invokeRepoIntrospect.ts uses same pattern (verified in r4 review)

**holds:** yes. both discover roles via `getRoleRegistry()`. no divergence.

### vision: edge cases from evaluation table

| edgecase | expected | implementation |
|----------|----------|----------------|
| empty src dir | no-op, exit 0 | ✓ zero roles → zero files → clean exit |
| absent --into | fail-fast | ✓ Commander.js requiredOption |
| --into outside repo | fail-fast | ✓ line 58-65 startsWith check |
| no package.json | fail-fast | ✓ line 73-75 JSON.parse throws if absent |
| extant dist/ contents | preserve | ✓ no rm -rf, only copyFileSync |
| empty dirs after copy | prune | ✓ mkdirSync only when files written |

## implementation adherance

### invokeRepoCompile.ts

**blueprint spec:**
```
invokeRepoCompile (contract/cli)
  ├─ [←] validate package.json extant (reuse from invokeRepoIntrospect)
  ├─ [←] validate --from dir extant (reuse assertPathWithinRepo pattern)
  ├─ [←] validate --into within repo (reuse assertPathWithinRepo pattern)
  ├─ [←] discover roles via getRoleRegistry (reuse from invokeRepoIntrospect)
  ├─ [+] validate roles discovered
  └─ for each role:
      ├─ [+] getAllArtifactsForRole
      └─ [←] upsertFile (reuse from src/infra, copy variant)
```

**adherance check:**

| blueprint item | implementation | line | holds? |
|----------------|----------------|------|--------|
| validate package.json extant | `JSON.parse(readFileSync(packageJsonPath, 'utf8'))` | 73-75 | yes |
| validate --from dir extant | `existsSync(fromDir)` check | 67-70 | yes |
| validate --into within repo | `intoDir.startsWith(gitRoot)` check | 58-65 | yes |
| discover roles via getRoleRegistry | `localRequire(entryPath)` + `getRoleRegistry()` | 88-100 | yes |
| validate roles discovered | (implicit — getRoleRegistry returns array) | — | partial |
| for each role getAllArtifactsForRole | `for (const role of registry.roles)` + `getAllArtifactsForRole` | 110-116 | yes |
| copy files | `copyFileSync(srcPath, destPath)` | 132 | yes |

**deviation found:** blueprint mentions "validate roles discovered" but implementation does NOT explicitly check `roles.length === 0`. however, if no roles exist, the loop produces zero iterations and reports "0 file(s)" which is acceptable behavior.

### getAllArtifactsForRole.ts

**blueprint spec:**
```ts
const DEFAULT_ARTIFACT_EXCLUSIONS = ['.test/**', '__test_*/**', '.route/**', '.scratch/**', '.behavior/**', '*.test.*', '.*'];

const DEFAULT_ARTIFACT_INCLUSIONS = {
  briefs: ['**/*.md', '**/*.min'],
  skills: ['**/*.sh', '**/*.jsonc', '**/template/**', '**/templates/**'],
  inits: ['**/*.sh', '**/*.jsonc'],
};
```

**adherance check:**

| blueprint item | implementation | line | holds? |
|----------------|----------------|------|--------|
| DEFAULT_ARTIFACT_EXCLUSIONS array | exact match | 9-17 | yes |
| DEFAULT_ARTIFACT_INCLUSIONS.briefs | `['**/*.md', '**/*.min']` | 20 | yes |
| DEFAULT_ARTIFACT_INCLUSIONS.skills | `['**/*.sh', '**/*.jsonc', '**/template/**', '**/templates/**']` | 21 | yes |
| DEFAULT_ARTIFACT_INCLUSIONS.inits | `['**/*.sh', '**/*.jsonc']` | 22 | yes |
| extractDirUris helper | normalizes single vs array dirs | 29-35 | yes |
| briefs dir iteration | for loop with getAllFilesByGlobs | 50-67 | yes |
| skills dir iteration | for loop with getAllFilesByGlobs | 70-87 | yes |
| inits dir iteration | for loop with getAllFilesByGlobs | 90-107 | yes |
| readme.uri copy | `if (readmeUri) ... existsSync ... artifacts.push` | 110-116 | yes |
| boot.uri copy | `if (bootUri) ... existsSync ... artifacts.push` | 118-124 | yes |
| keyrack.uri copy | `if (keyrackUri) ... existsSync ... artifacts.push` | 126-132 | yes |

### getAllFilesByGlobs.ts

**blueprint spec:**
```ts
precedence (highest to lowest):
  1. user exclude → always excludes
  2. user include → rescues from default exclusions
  3. default exclude → applies unless user include matches
  4. default include → baseline
```

**adherance check:**

| blueprint item | implementation | line | holds? |
|----------------|----------------|------|--------|
| fast-glob for candidates | `await glob(allIncludes, ...)` | 25-29 | yes |
| picomatch for filter | `pm(input.userExclude, ...)` etc | 32-40 | yes |
| precedence 1: user exclude | `if (matchUserExclude(rel)) return false` | 47 | yes |
| precedence 2: user include | `if (matchUserInclude(rel)) return true` | 50 | yes |
| precedence 3: default exclude | `if (matchDefaultExclude(rel)) return false` | 53 | yes |
| precedence 4: included by default | `return true` | 56 | yes |

## deviations found

### minor deviation 1: no explicit "roles discovered" validation

blueprint says `[+] validate roles discovered` but implementation does not throw if `roles.length === 0`. however, the behavior is acceptable — zero roles means zero files copied, which is reported correctly.

**decision:** this is not a defect. an empty role registry is a valid edge case (e.g., package in development). the output "0 file(s)" communicates the situation clearly.

### minor deviation 2: blueprint mentions upsertFile, implementation uses copyFileSync

blueprint says `[←] upsertFile (reuse from src/infra, copy variant)` but implementation uses native `copyFileSync`.

**decision:** this is acceptable. the has-consistent-mechanisms review (r3) already verified this choice. `copyFileSync` is simpler for copy-only operations and avoids console.log side effects from upsertFile.

## deep adherance verification

### rsync-style precedence — verified correct

the blueprint specified 4-level precedence. i traced the implementation filter logic:

```ts
// line 47 — level 1
if (matchUserExclude(rel)) return false;  // user exclude wins over everything

// line 50 — level 2
if (matchUserInclude(rel)) return true;   // user include rescues from defaults

// line 53 — level 3
if (matchDefaultExclude(rel)) return false;  // default exclude applies

// line 56 — level 4
return true;  // included by default if not excluded
```

the order is critical: levels 1-4 must be checked in order. the code checks them in order. any reorder would break the semantics.

**why it holds:** the filter function returns early at each level. level 1 (`return false`) prevents levels 2-4 from executing. level 2 (`return true`) prevents levels 3-4. the early-return pattern enforces precedence.

### artifact type coverage — verified complete

the blueprint specified: briefs, skills, inits, readme.md, boot.yml, keyrack.yml.

i traced each:
- briefs: lines 50-67, uses `DEFAULT_ARTIFACT_INCLUSIONS.briefs`
- skills: lines 70-87, uses `DEFAULT_ARTIFACT_INCLUSIONS.skills`
- inits: lines 90-107, uses `DEFAULT_ARTIFACT_INCLUSIONS.inits`
- readme: lines 110-116, checks `input.role.readme?.uri`
- boot: lines 118-124, checks `input.role.boot?.uri`
- keyrack: lines 126-132, checks `input.role.keyrack?.uri`

**why it holds:** each artifact type has its own code block. the blocks are parallel in structure. if one was omitted, it would be visually obvious. all six are present.

### path validation — verified enforced

the blueprint specified paths must be within repo.

i traced both validations:
- `--from`: line 49 checks `fromDir.startsWith(gitRoot)`
- `--into`: line 58 checks `intoDir.startsWith(gitRoot)`

**why it holds:** both use `startsWith()` against `gitRoot`. this prevents path traversal outside the repository. the checks throw `BadRequestError` with clear message before any file operations occur.

## conclusion

implementation matches blueprint with two minor deviations:
1. no explicit roles.length check (acceptable — zero files output is clear)
2. native copyFileSync vs upsertFile (acceptable — simpler, no side effects)

all key behaviors adhere to the spec:
- rsync-style precedence implemented correctly (verified early-return order)
- all artifact types handled (verified all six present)
- path validation enforced (verified startsWith checks)
- getRoleRegistry discovery pattern reused from invokeRepoIntrospect
