# plan: revert backwards-incompatible practs changes

## context

declapract practs upgrade introduced changes that break rhachet-specific functionality. this plan identifies changes that must be reverted to maintain compatibility.

---

## phase 1: jest config — ESM module handle (BLOCKER)

### .what
jest configs removed ESM module mappings for `@noble/*`, `@scure/*`, and `age-encryption` packages.

### .why revert
rhachet keyrack uses `age-encryption` for secure key storage. these packages are ESM-only and require special jest handle.

### .files
- `jest.unit.config.ts`
- `jest.integration.config.ts`

### .changes to revert
```ts
// restore these mappings in moduleNameMapper:
'^@noble/hashes/(.*)\\.js$': '<rootDir>/node_modules/@noble/hashes/$1.js',
'^@noble/curves/(.*)\\.js$': '<rootDir>/node_modules/@noble/curves/$1.js',
'^@noble/hashes/([^.]+)$': '<rootDir>/node_modules/@noble/hashes/$1.js',
'^@noble/curves/([^.]+)$': '<rootDir>/node_modules/@noble/curves/$1.js',
'^@scure/base$': '<rootDir>/node_modules/@scure/base/index.js',

// restore in transformIgnorePatterns (unit):
'node_modules/(?!(\\.pnpm/(age-encryption|@noble|@scure|@octokit|universal-user-agent|universal-github-app-jwt)[^/]*/node_modules/(age-encryption|@noble|@scure|@octokit|universal-user-agent|universal-github-app-jwt)/|(age-encryption|@noble|@scure|@octokit|universal-user-agent|universal-github-app-jwt)/))',

// restore in transformIgnorePatterns (integration):
'/node_modules/(?!(\\.pnpm/(age-encryption|@noble|@scure|@octokit|universal-|@anthropic-ai|@openai))|(age-encryption|@noble|@scure|@octokit|universal-|@anthropic-ai|@openai))',

// restore in integration config:
moduleFileExtensions: ['js', 'ts', 'mjs'],
extensionsToTreatAsEsm: ['.ts'],
```

---

## phase 2: workflow — API keys and age cli (BLOCKER)

### .what
workflow removed:
1. secrets for `openai-api-key`, `anthropic-api-key`, `xai-api-key`
2. `age` cli install step
3. env vars passed to test steps

### .why revert
- brain integration tests require API keys
- keyrack tests require `age` cli for encrypt/decrypt

### .files
- `.github/workflows/.test.yml`

### .changes to revert
```yaml
# restore secrets input:
secrets:
  openai-api-key:
    description: "api key for openai, used in integration tests"
    required: true
  anthropic-api-key:
    description: "api key for anthropic, used in integration tests"
    required: true
  xai-api-key:
    description: "api key for xai, used in integration tests"
    required: true

# restore age cli install in test jobs:
- name: install age cli
  run: sudo apt-get install -y age

# restore env vars in test steps:
env:
  OPENAI_API_KEY: ${{ secrets.openai-api-key }}
  ANTHROPIC_API_KEY: ${{ secrets.anthropic-api-key }}
  XAI_API_KEY: ${{ secrets.xai-api-key }}
```

---

## phase 3: package.json — version downgrades (BLOCKER)

### .what
packages were downgraded:
- `rhachet`: 1.34.0 → 1.28.2
- `rhachet-roles-ehmpathy`: 1.26.0 → 1.17.34

### .why revert
these are significant version rollbacks that would lose features and fixes.

### .files
- `package.json`

### .changes to revert
```json
// restore versions:
"rhachet": "1.34.0",
"rhachet-roles-ehmpathy": "1.26.0",
```

note: after revert, run `pnpm install` to regenerate lockfile.

---

## phase 4: claude settings — skill permissions (BLOCKER)

### .what
removed permissions for mechanic skills:
- `git.commit.*` skills (uses, bind, set, push)
- `get.package.docs` skill
- `condense` skill
- write/edit to `.agent/.notes/**`
- changed WebFetch from global to domain-restricted

### .why revert
mechanic role depends on these skills for:
- commit code changes
- read package documentation
- condense briefs

### .files
- `.claude/settings.json`

### .changes to revert
restore all removed permission entries in the `allow` array.

---

## phase 5: claude settings — hooks (NITPICK)

### .what
removed hooks:
- `EnterPlanMode` → `pretooluse.forbid-planmode`
- `WebFetch` → `posttooluse.guardBorder.onWebfetch`

### .why maybe revert
these hooks may be intentionally removed. verify with human before revert.

---

## phase 6: jest env — timeout and API key verification (NITPICK)

### .what
- timeout reduced: 180s → 90s
- removed direct API key check for OPENAI/ANTHROPIC
- replaced with config-based check, but config has empty `required: []`

### .files
- `jest.integration.env.ts`
- `.agent/repo=.this/role=any/skills/use.apikeys.json`

### .changes to consider
1. restore timeout to 180s (brain tests can be slow)
2. populate `use.apikeys.json` with required keys:
```json
{
  "apikeys": {
    "required": ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "XAI_API_KEY"]
  }
}
```

---

## phase 7: use.apikeys.sh — key verification (NITPICK)

### .what
removed verification of specific API keys (OPENAI, ANTHROPIC, XAI, TAVILY).

### .why maybe keep
the new config-based approach in jest env files is more flexible. just need to populate the config file correctly (see phase 6).

---

## phase 8: source imports (KEEP)

### .what
changed relative imports (`../../../`) to absolute imports (`@src/`).

### .why keep
this is a code style improvement, not a break. keep it.

---

## summary

| phase | scope | severity | action |
|-------|-------|----------|--------|
| 1 | jest ESM handle | BLOCKER | revert |
| 2 | workflow secrets/age | BLOCKER | revert |
| 3 | package versions | BLOCKER | revert |
| 4 | claude skill perms | BLOCKER | revert |
| 5 | claude hooks | NITPICK | verify with human |
| 6 | jest timeout/apikeys | NITPICK | fix config |
| 7 | use.apikeys.sh | NITPICK | keep (use config) |
| 8 | source imports | — | keep |

---

## execution order

1. revert phase 1 (jest configs)
2. revert phase 2 (workflow)
3. revert phase 3 (package versions)
4. revert phase 4 (claude permissions)
5. fix phase 6 (populate apikeys config, restore timeout)
6. run `pnpm install`
7. run `npm run test:types` to verify
8. run `npm run test:integration -- path/to/keyrack` to verify age works
