# self-review: role-standards-adherance

## rule directories checked

i identified the mechanic briefs directories relevant to this code:

| directory | why relevant |
|-----------|--------------|
| `code.prod/evolvable.procedures` | jest env files are procedural code |
| `code.prod/pitofsuccess.errors` | ConstraintError usage, fail-fast |
| `code.prod/readable.comments` | .what/.why headers |
| `code.prod/readable.narrative` | code paragraph structure |
| `lang.terms` | variable and function names |

i confirmed i have not missed any rule categories by:
- read through the subdirectories under `.agent/repo=ehmpathy/role=mechanic/briefs/practices/`
- `code.test` not relevant (we modified test infrastructure, not test code)
- `work.flow` not relevant (no release or refactor workflow)

## line-by-line review of jest.integration.env.ts

### lines 86-94: .what/.why header

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

**rule.require.what-why-headers check:**
- `.what` present on line 87 ✓
- `.why` present on lines 88-90 ✓
- `.note` used for caveats on lines 92-93 ✓
- all lowercase prose ✓

**holds**: follows comment discipline exactly.

### lines 95-103: type definition

```ts
const { ConstraintError } = require('helpful-errors');

type KeyrackGetResponse = Array<{
  status: 'unlocked' | 'locked' | 'absent';
  slug: string;
  secret?: string;
  fix?: string;
}>;
```

**rule.forbid.gerunds check:**
- `KeyrackGetResponse` — not a gerund (noun + noun) ✓
- `status`, `slug`, `secret`, `fix` — all nouns ✓

**holds**: no gerunds in type name or properties.

### lines 105-110: keyrack spawn

```ts
try {
  const keyrackResult = execSync(
    'npx rhx keyrack get --for repo --env test --json --owner ehmpath',
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
  );
  const keys: KeyrackGetResponse = JSON.parse(keyrackResult);
```

**rule.require.narrative-flow check:**
- code is flat, no nested blocks yet ✓
- variable names are descriptive nouns ✓

**rule.forbid.gerunds check:**
- `keyrackResult` — not a gerund ✓
- `keys` — simple noun ✓

**holds**: follows narrative and gerund rules.

### lines 112-122: locked keys guard

```ts
  // check if any keys are locked
  const keysLocked = keys.filter((k) => k.status === 'locked');
  if (keysLocked.length > 0) {
    throw new ConstraintError(
      'keyrack not unlocked. unlock to run integration tests:',
      {
        fix: 'rhx keyrack unlock --env test --owner ehmpath',
        note: 'we expect ehmpaths to work in this repo',
      },
    );
  }
```

**rule.require.fail-fast check:**
- guard clause throws immediately when condition met ✓
- ConstraintError used (not generic Error) ✓
- `fix` field provides actionable command ✓

**rule.forbid.else-branches check:**
- no else branch, just if-throw ✓

**rule.require.order.noun_adj check:**
- `keysLocked` follows [noun][adj] pattern ✓

**holds**: follows fail-fast, no-else, and noun order rules.

### lines 124-131: absent keys guard

```ts
  // check if any keys are absent
  const keysAbsent = keys.filter((k) => k.status === 'absent');
  if (keysAbsent.length > 0) {
    throw new ConstraintError('keyrack keys absent:', {
      absent: keysAbsent.map((k) => k.slug),
      fixes: keysAbsent.map((k) => k.fix),
    });
  }
```

**rule.require.fail-fast check:**
- second guard clause after first ✓
- throws ConstraintError with fix info ✓

**rule.require.order.noun_adj check:**
- `keysAbsent` follows [noun][adj] pattern ✓

**holds**: consistent with the locked keys guard above.

### lines 133-142: inject secrets

```ts
  // inject unlocked secrets into process.env
  for (const key of keys) {
    if (key.status === 'unlocked' && key.secret) {
      // extract env var name from slug (e.g., "ehmpathy.test.OPENAI_API_KEY" → "OPENAI_API_KEY")
      const envVarName = key.slug.split('.').pop();
      if (envVarName && !process.env[envVarName]) {
        process.env[envVarName] = key.secret;
      }
    }
  }
```

**rule.require.immutable-vars check:**
- `process.env` mutation is necessary for test setup ✓
- `key` is not mutated, only read ✓

**rule.forbid.gerunds check:**
- `envVarName` — not a gerund ✓

**holds**: mutation is contained to process.env injection, which is the purpose of this infrastructure file.

### lines 143-156: error handler

```ts
} catch (error) {
  // re-throw ConstraintErrors as-is
  if (error instanceof ConstraintError) throw error;

  // wrap other errors (e.g., keyrack not installed, command failed)
  throw new ConstraintError(
    'failed to fetch keys from keyrack. is keyrack installed and unlocked?',
    {
      fix: 'rhx keyrack unlock --env test --owner ehmpath',
      note: 'we expect ehmpaths to work in this repo',
      cause: error instanceof Error ? error.message : String(error),
    },
  );
}
```

**rule.forbid.failhide check:**
- try/catch does not hide errors — it re-throws them ✓
- ConstraintErrors pass through unchanged ✓
- other errors are wrapped with context and re-thrown ✓

**holds**: this is the correct pattern for error wrap, not error hide.

## line-by-line review of daoKeyrackHostManifest/index.ts

### lines 50-57: .what/.why header for getAllAvailableIdentities

```ts
/**
 * .what = get all available identities to try for decryption
 * .why = enables trial-decryption when no identity is explicitly set
 *
 * .note = checks ssh-agent first (most likely to have unlocked key)
 * .note = then checks standard ssh paths (~/.ssh/id_ed25519, etc)
 * .note = then checks owner-specific path as fallback (~/.ssh/$owner)
 */
```

**rule.require.what-why-headers check:**
- `.what` present ✓
- `.why` present ✓
- `.note` used for implementation details ✓

**holds**: follows comment discipline.

### lines 58-60: function signature

```ts
const getAllAvailableIdentities = (owner?: string | null): string[] => {
  const identities: string[] = [];
  const home = process.env.HOME ?? homedir();
```

**rule.require.arrow-only check:**
- arrow function syntax ✓
- no `function` keyword ✓

**rule.require.input-context-pattern check:**
- function takes single optional input `owner` ✓
- no context needed (pure discovery function) ✓

**holds**: follows arrow and input patterns.

### lines 93-104: owner-specific path fallback

```ts
  // check owner-specific path as fallback (e.g., ~/.ssh/ehmpath)
  if (owner) {
    const ownerPath = join(home, '.ssh', owner);
    if (existsSync(ownerPath)) {
      try {
        const identity = sshPrikeyToAgeIdentity({ keyPath: ownerPath });
        if (!identities.includes(identity)) identities.push(identity);
      } catch {
        // skip if conversion fails
      }
    }
  }
```

**rule.require.narrative-flow check:**
- code paragraph has comment title ✓
- nested structure is necessary for conditional checks ✓

**rule.forbid.gerunds check:**
- `ownerPath` — not a gerund ✓
- `identity` — noun ✓

**rule.require.immutable-vars check:**
- `identities.push()` mutates array, but this is a builder pattern within the function ✓
- the array is not exported or passed in ✓

**holds**: follows narrative flow and uses acceptable mutation for builder pattern.

## reflection

### potential violations i looked for

| potential issue | what i checked | outcome |
|-----------------|----------------|---------|
| failhide in try/catch | lines 143-156 | re-throws all errors, does not hide |
| gerund variable names | all new variables | keyrackResult, keysLocked, keysAbsent, envVarName — none are gerunds |
| else branches | all if statements | only if-throw guards, no else |
| generic Error | error throw sites | ConstraintError used throughout |
| mutation of inputs | for loop at 134 | only mutates process.env, not input arrays |

### why each rule holds

**why fail-fast holds:**

the code follows the fail-fast pattern because:
1. guard clauses are placed at the top of the try block (lines 112-131)
2. each guard throws ConstraintError with actionable fix commands
3. no silent failures or deferred error handle

**why comment discipline holds:**

the .what/.why comment at lines 86-94 follows the exact structure from rule.require.what-why-headers:
- `.what` on one line that describes intent
- `.why` with bullet points for reasons
- `.note` for caveats about hardcoded owner and passthrough

**why no gerunds holds:**

i examined each new variable name:
- `keyrackResult` = keyrack + result (two nouns)
- `keysLocked` = keys + locked (noun + adjective)
- `keysAbsent` = keys + absent (noun + adjective)
- `envVarName` = env + var + name (three nouns)

none use -ing suffix as a noun. the variable names describe state or outcome, not action.

### what i learned

role standards review is most effective when done line-by-line with explicit rule checks. tables make it easy to verify each rule was checked. cited line numbers allow future reviewers to verify claims.

**no issues found** — implementation adheres to mechanic role standards.
