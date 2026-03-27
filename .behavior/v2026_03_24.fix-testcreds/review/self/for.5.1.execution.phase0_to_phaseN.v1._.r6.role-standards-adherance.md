# self-review: role-standards-adherance

## rule directories checked

i enumerated the mechanic briefs directories relevant to this code:

| directory | relevance |
|-----------|-----------|
| `code.prod/evolvable.procedures` | jest env files follow procedure patterns |
| `code.prod/pitofsuccess.errors` | ConstraintError usage, fail-fast patterns |
| `code.prod/readable.comments` | .what/.why headers, comment discipline |
| `code.prod/readable.narrative` | code paragraph structure, guard clauses |
| `lang.terms` | variable names, function names |

not relevant for this behavior:
- `code.test` — we modified test infrastructure, not test code itself
- `work.flow` — no release or refactor workflow changes

## file-by-file standards check

### file.1 = jest.integration.env.ts

| rule | check | status |
|------|-------|--------|
| `rule.require.what-why-headers` | comment has `.what` and `.why` | ✓ adheres |
| `rule.require.fail-fast` | ConstraintError thrown early | ✓ adheres |
| `rule.forbid.failhide` | no try/catch that hides errors | ✓ adheres |
| `rule.require.arrow-only` | no function keyword | ✓ adheres |
| `rule.forbid.gerunds` | no gerund variable names | ✓ adheres |
| `rule.require.order.noun_adj` | variable names follow [noun][adj] | ✓ adheres |

**holds**: code follows mechanic standards.

### file.2 = jest.acceptance.env.ts

same checks as integration env. all patterns identical.

**holds**: consistent with integration env and mechanic standards.

### file.3 = daoKeyrackHostManifest/index.ts

| rule | check | status |
|------|-------|--------|
| `rule.require.input-context-pattern` | function takes `owner?: string \| null` | ✓ adheres |
| `rule.forbid.else-branches` | no else statements added | ✓ adheres |
| `rule.require.narrative-flow` | code paragraphs with comment titles | ✓ adheres |
| `rule.require.immutable-vars` | no mutation of input | ✓ adheres |

**holds**: extension follows extant patterns.

### file.4 = package.json

| rule | check | status |
|------|-------|--------|
| n/a | package.json is config, not code | ✓ n/a |

**holds**: only removed legacy command, no new code patterns to review.

### file.5 = .claude/settings.json

| rule | check | status |
|------|-------|--------|
| n/a | settings.json is config, not code | ✓ n/a |

**holds**: only removed legacy permission entry.

## detailed adherance verification

### rule.require.fail-fast

the vision says "failfast with ConstraintError". i verified:

1. **guard placement** — the keyrack check happens early in the file, after testdb check
2. **error type** — ConstraintError used (not generic Error)
3. **fix field** — error includes actionable fix command
4. **no catch** — no try/catch that could hide the error

this follows the fail-fast pattern: detect invalid state early, throw with actionable guidance.

### rule.require.what-why-headers

i verified the comment block at lines 93-103:

```ts
/**
 * .what = verify that required api keys are present via keyrack; otherwise, fail fast
 * .why =
 *   - prevent time wasted on tests that fail due to absent api keys
 *   - prevent agents from surrender when they have access to credentials
 *
 * .note = hardcoded to --owner ehmpath because we expect only ehmpaths to work in this repo
 * .note = keyrack already prefers passthrough (checks env vars first)
 */
```

this follows the comment discipline pattern:
- `.what` = single line intent summary
- `.why` = up to 3 lines of reasons
- `.note` = optional caveats

### rule.forbid.gerunds

i scanned all new variable names:

| variable | check |
|----------|-------|
| `keyrackResult` | noun + noun (not gerund) |
| `keysLocked` | noun + adjective (not gerund) |
| `keysAbsent` | noun + adjective (not gerund) |
| `envVarName` | noun + noun + noun (not gerund) |

no gerunds introduced.

### rule.require.narrative-flow

the code follows flat paragraph structure:

```ts
// spawn keyrack get to check key status
const keyrackResult = execSync(...);

// parse response
const keys: KeyrackGetResponse = JSON.parse(keyrackResult);

// check for locked keys
const keysLocked = keys.filter(...);
if (keysLocked.length) throw new ConstraintError(...);

// check for absent keys
const keysAbsent = keys.filter(...);
if (keysAbsent.length) throw new ConstraintError(...);

// inject secrets into process.env
for (const key of keys) { ... }
```

each paragraph has:
- comment title
- focused responsibility
- no nested structure beyond guards

## reflection

### my verification approach

i walked through the rule directories and selected rules that could apply to this code. for each rule, i checked the actual implementation line by line.

### potential violations i looked for

| potential violation | what i checked | why it holds |
|---------------------|----------------|--------------|
| hidden errors | could have wrapped keyrack spawn in try/catch | no catch block exists; errors propagate |
| else branches | could have used if/else for locked vs absent | used separate if guards instead |
| gerund names | could have used `process*`, `check*` as gerunds | all names are nouns or adjectives |
| mutation | could have mutated keys array | used filter to create new arrays |

### why the code adheres

the implementation follows mechanic conventions because:

1. **fail-fast pattern** — errors thrown immediately when detected, not deferred
2. **comment discipline** — .what/.why/.note structure matches extant comments in same file
3. **name conventions** — camelCase, noun-based, no gerunds
4. **narrative flow** — flat paragraphs with guard clauses, no nested structures

### what i learned

role standards review requires awareness of which rules apply to which code. config files (package.json, settings.json) have no code patterns to review. procedure code (jest.*.env.ts) has many applicable rules. extension code (daoKeyrackHostManifest) should match extant patterns in the file.

**no issues found** — implementation adheres to mechanic role standards.
