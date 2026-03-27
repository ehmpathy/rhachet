# self-review: has-consistent-conventions

## search for extant conventions

i searched the codebase for related patterns to compare against my implementation.

### search.1 = variable names in jest env files

```bash
grep -E "^const [a-z]" jest.*.env.ts
```

extant variables: `declapractUsePath`, `declapractUseContent`, `requiresAwsAuth`, `requiresTestDb`, `testConfigPath`, `testConfig`

pattern observed: camelCase, descriptive nouns with adjective suffixes (e.g., `*Path`, `*Content`, `*Config`)

### search.2 = type definitions in codebase

```bash
grep "^type [A-Z]" src/domain.objects/*.ts
```

extant types use suffixes like `Input`, `Serializable`, or descriptive names. no clear "Response" pattern exists, but PascalCase is universal.

### search.3 = error patterns in jest env files

```bash
grep "throw new" jest.*.env.ts
```

extant errors: all use `Error` (standard). my code introduces `ConstraintError` (from helpful-errors). this divergence is intentional per vision — ConstraintError provides exit code 2 and fix commands.

## convention.1 = variable names

| question | answer |
|----------|--------|
| what convention does codebase use? | camelCase with descriptive suffixes |
| do we diverge? | no |
| do we introduce new terms? | yes — `keysLocked`, `keysAbsent`, `keyrackResult` |

i examined whether my new terms fit the extant vocabulary:

- `keyrackResult` — follows pattern of `testConfig`, `declapractUseContent`
- `keysLocked` — adjective suffix like `requiresAwsAuth`, `requiresTestDb`
- `keysAbsent` — same pattern as above
- `envVarName` — descriptive compound name

**holds**: new variable names follow extant patterns. terms are domain-appropriate (keyrack, keys).

## convention.2 = type name

| question | answer |
|----------|--------|
| what convention does codebase use? | PascalCase with purpose suffix |
| do we diverge? | no |
| is `Response` a good suffix? | examined alternatives |

i considered alternative names:
- `KeyrackGetResult` — "result" used for function returns, not API shapes
- `KeyrackKeyStatus` — more domain-specific but less clear about source
- `KeyrackGetResponse` — describes what it is: response from keyrack get

the name `KeyrackGetResponse` accurately describes the shape: it's the JSON response from the `keyrack get` CLI command.

**holds**: type name is PascalCase and descriptive.

## convention.3 = error class (divergence investigation)

| question | answer |
|----------|--------|
| what convention does codebase use? | `throw new Error(message)` |
| do we diverge? | yes — we use `ConstraintError` |
| is divergence intentional? | yes — per vision |

the vision explicitly specifies `ConstraintError`:
- provides exit code 2 (user-fixable constraint)
- includes `fix` field with exact command
- distinct from `Error` (general failure)

this is intentional divergence, not accidental. the vision says "failfast with ConstraintError" and shows the exact format.

**holds**: divergence is explicit and per-vision. not a convention violation.

## convention.4 = comment style

| question | answer |
|----------|--------|
| what convention does codebase use? | `.what`, `.why`, `.note` jsdoc pattern |
| do we diverge? | no |
| prose style? | lowercase throughout |

extant comment in same file (line 12-14):
```ts
/**
 * .what = verify that we're running from a valid project directory; otherwise, fail fast
 * .why = prevent confusion and hard-to-debug errors from running tests in the wrong directory
 */
```

my comment (line 87-94):
```ts
/**
 * .what = verify that required api keys are present via keyrack; otherwise, fail fast
 * .why =
 *   - prevent time wasted waiting on tests to fail due to missing api keys
 *   - prevent agents from giving up when they have access to credentials
 *
 * .note = hardcoded to --owner ehmpath because we expect only ehmpaths to work in this repo
 * .note = keyrack already prefers passthrough (checks env vars first)
 */
```

**holds**: follows exact `.what/.why/.note` pattern with lowercase prose.

## convention.5 = execSync options

| question | answer |
|----------|--------|
| what convention does codebase use? | `execSync(cmd, { options })` |
| do we diverge? | no |

extant pattern (testdb check):
```ts
execSync(`PGPASSWORD="..." psql ...`, { timeout: 3000 });
```

my pattern:
```ts
execSync('npx rhx keyrack get ...', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
```

both use the same `execSync(cmd, options)` structure. different options are appropriate for different use cases.

**holds**: same structural pattern.

## reflection

i examined each name and pattern choice against extant conventions.

### the investigation process

i started by searching for extant patterns in the same files and related code:

1. **variable names** — searched `jest.*.env.ts` for `const` declarations to find naming patterns
2. **type names** — searched `src/domain.objects` for type definitions to find suffix conventions
3. **error patterns** — searched for `throw new` to find error class usage
4. **comment patterns** — read through jest env files to confirm jsdoc style

### the one divergence i found

the most significant finding: my code uses `ConstraintError` where extant code uses `Error`.

i investigated whether this was accidental or intentional:

1. searched the vision document for error guidance
2. found explicit instruction: "failfast with ConstraintError" with `fix` field
3. confirmed `ConstraintError` provides exit code 2 (user-fixable constraint)
4. confirmed the vision shows exact error format with fix command

conclusion: this divergence is by design, not accidental.

### why the rest holds

| aspect | investigation | conclusion |
|--------|---------------|------------|
| `keysLocked`, `keysAbsent` | compared to `requiresAwsAuth`, `testConfig` | same camelCase + adjective pattern |
| `KeyrackGetResponse` | compared to `...Input`, `...Serializable` | PascalCase, descriptive suffix |
| `.what/.why/.note` | compared to comment at line 12-14 | exact same structure |
| `execSync(cmd, opts)` | compared to testdb check at line 75 | same structural pattern |

### what i learned

convention reviews should start with search, not assumption. i initially assumed everything was consistent, but searching first revealed the `ConstraintError` divergence — which turned out to be intentional but required investigation to confirm.

**no issues found** — all conventions are consistent or intentionally divergent per vision.
