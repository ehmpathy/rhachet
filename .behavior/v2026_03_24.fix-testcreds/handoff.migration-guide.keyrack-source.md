# migration guide: use.apikeys.sh → keyrack.source()

## what changed

replaced adhoc apikeys pattern with keyrack-based credential injection.

### before (legacy)

```
.agent/repo=.this/role=any/skills/
├── use.apikeys.json    # hardcoded key paths
└── use.apikeys.sh      # shell file to source

jest.integration.env.ts:
- reads use.apikeys.json
- checks process.env for each key
- throws error with command for user to run: source .agent/.../use.apikeys.sh
```

### after (keyrack)

```
.agent/keyrack.yml                # declares required keys per env
jest.integration.env.ts:
- calls keyrack.source({ env: 'test', owner: 'ehmpath' })
- keys auto-injected into process.env
- if locked: failfast with unlock command
- if absent: failfast with set commands
```

---

## migration steps

### 1. add keyrack.yml

create `.agent/keyrack.yml` that declares your test keys:

```yaml
# .agent/keyrack.yml
org: yourorg
env:
  test:
    - OPENAI_API_KEY
    - ANTHROPIC_API_KEY
    - XAI_API_KEY
```

### 2. replace jest env logic

in `jest.integration.env.ts` and `jest.acceptance.env.ts`:

```typescript
// before
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const apikeysPath = join(__dirname, '.agent/repo=.this/role=any/skills/use.apikeys.json');
if (existsSync(apikeysPath)) {
  const config = JSON.parse(readFileSync(apikeysPath, 'utf8'));
  // ... check and throw
}

// after
import { keyrack } from 'rhachet/keyrack';

keyrack.source({
  env: 'test',
  owner: 'ehmpath',  // your org's owner
});
```

### 3. delete legacy files

```bash
rhx rmsafe --path '.agent/repo=.this/role=any/skills/use.apikeys.sh'
rhx rmsafe --path '.agent/repo=.this/role=any/skills/use.apikeys.json'
```

### 4. update ci workflow

ensure ci has keys via environment secrets (keyrack prefers env vars first):

```yaml
# .github/workflows/.test.yml
env:
  OPENAI_API_KEY: ${{ secrets.openai-api-key }}
  ANTHROPIC_API_KEY: ${{ secrets.anthropic-api-key }}
```

no unlock needed in ci — keyrack checks process.env first.

---

## developer workflow after migration

### first time setup

```bash
# run tests
npm run test:integration

# if keyrack locked:
#   ConstraintError: keyrack not unlocked
#   fix: rhx keyrack unlock --env test --owner ehmpath

# if keys absent:
#   ConstraintError: keyrack keys absent
#   fixes: rhx keyrack set --key OPENAI_API_KEY --env test
#          rhx keyrack set --key ANTHROPIC_API_KEY --env test

# unlock once per session
rhx keyrack unlock --env test --owner ehmpath

# tests now work
npm run test:integration
```

### daily workflow

```bash
# keyrack stays unlocked via daemon
npm run test:integration  # just works
```

---

## error messages

### keyrack locked

```
ConstraintError: keyrack not unlocked. unlock to run integration tests.

fix: rhx keyrack unlock --env test --owner ehmpath
note: we expect ehmpaths to work in this repo
```

### keys absent

```
ConstraintError: keyrack keys absent.

absent:
  - yourorg.test.OPENAI_API_KEY
  - yourorg.test.XAI_API_KEY

fixes:
  - rhx keyrack set --key OPENAI_API_KEY --env test
  - rhx keyrack set --key XAI_API_KEY --env test
```

---

## benefits

| dimension | before | after |
|-----------|--------|-------|
| auth frequency | every terminal | once per session |
| error guidance | "source this shell file" | exact unlock/set commands |
| key discovery | hunt for .env files | keyrack knows what exists |
| ci support | manual env setup | keyrack prefers env vars |
| security | plaintext json file | encrypted vault |

---

## files changed in this behavior

| file | change |
|------|--------|
| jest.integration.env.ts | replaced apikeys check with keyrack.source() |
| jest.acceptance.env.ts | replaced apikeys check with keyrack.source() |
| .agent/keyrack.yml | added (declares test keys) |
| .agent/.../use.apikeys.sh | deleted |
| .agent/.../use.apikeys.json | deleted |
| src/access/daos/daoKeyrackHostManifest/index.ts | extended prikey lookup for --owner |

---

## see also

- `.behavior/v2026_03_24.fix-testcreds/1.vision.md` — full vision document
- `.behavior/v2026_03_24.fix-testcreds/3.3.1.blueprint.product.v1.i1.md` — implementation blueprint
- `.behavior/v2026_03_24.fix-testcreds/handoff.bhuild.guard-apikeys-to-keyrack.md` — bhuild guard updates
