# proposal: keys per environment in keyrack.yml

> how to specify which keys are needed for prod vs prep vs test

---

## the question

is "scope" the right word?

**no.** scope implies access boundaries (who can access). the question here is about **deployment targets** — which environment the keys are for.

better terms:
- **env** — aligns with environment variables, .env files, deployment environments
- **stage** — common in cicd (dev, stage, prod)
- **tier** — sometimes used, but less common

**recommendation: use `env`** — it's the most widely understood and aligns with prior conventions (.env.local, .env.prod, AWS_PROFILE=org.prod, etc).

---

## the problem

today, keyrack.yml declares keys flat:

```yaml
# keyrack.yml
keys:
  AWS_PROFILE_PROD: encrypted,ephemeral
  AWS_PROFILE_PREP: encrypted,ephemeral
  XAI_API_KEY: encrypted
```

problems:
1. **no env group** — unclear which keys belong to which env
2. **name convention burden** — user must invent consistent suffixes (_PROD, _PREP, etc)
3. **unlock friction** — `rhx keyrack unlock` unlocks all keys, even if user only needs prep
4. **blast radius** — unlock of prod keys when you only need test keys is unnecessary exposure

---

## design options

### option A: env prefix in slug (status quo)

```yaml
keys:
  AWS_PROFILE_PROD: encrypted,ephemeral
  AWS_PROFILE_PREP: encrypted,ephemeral
  XAI_API_KEY_PROD: encrypted
  XAI_API_KEY_TEST: encrypted
```

**pros:**
- already works, no changes needed
- explicit, no magic

**cons:**
- repetitive, no grouped structure
- name convention is user-managed (inconsistent across repos)
- unlock/get can't filter by env

**verdict:** baseline. works but doesn't solve the problem.

---

### option B: keys nested under envs

```yaml
env.prod:
  - AWS_PROFILE: ephemeral
  - XAI_API_KEY: encrypted

env.prep:
  - AWS_PROFILE: ephemeral
  - XAI_API_KEY: encrypted

env.test:
  - XAI_API_KEY: encrypted
```

**pros:**
- clear group by env
- unlock/get can filter: `--env prod`
- key names are clean (no suffix)

**cons:**
- duplication if same key needed across envs

**slug resolution:** `AWS_PROFILE` in `env.prod` with `org: ehmpathy` becomes slug `ehmpathy.prod.AWS_PROFILE`.

---

### option C: keys declare their envs

```yaml
keys:
  - AWS_PROFILE:
      grade: ephemeral
      envs: [prod, prep]
  - XAI_API_KEY:
      grade: encrypted
      envs: [prod, prep, test]
  - TEST_DB_URL:
      envs: [test]  # no grade = plaintext ok
```

**pros:**
- no duplication — key declared once, envs listed
- clear which envs need which keys
- can still filter by env at unlock/get time

**cons:**
- more complex structure (grade + envs vs just grade string)
- shorthand `- KEY: grade` no longer works for multi-env keys

**slug resolution:** `XAI_API_KEY` with `org: ehmpathy` and `envs: [prod, prep]` produces slugs `ehmpathy.prod.XAI_API_KEY`, `ehmpathy.prep.XAI_API_KEY`.

---

### option D: env.all + env overrides

```yaml
env.all:
  - XAI_API_KEY: encrypted

env.prod:
  - AWS_PROFILE: ephemeral

env.prep:
  - AWS_PROFILE: ephemeral
```

**pros:**
- DRY — common keys declared once under `env.all`
- env-specific keys scoped properly
- explicit — `env.all` makes it clear these apply to all envs
- envs are self-evident from `env.*:` sections (no redundant list)

**cons:**
- unclear if `env.all` key can be overridden per env

**slug resolution:** `env.all` keys expand to one slug per declared env (`ehmpathy.prod.XAI_API_KEY`, `ehmpathy.prep.XAI_API_KEY`). env-specific keys use their env directly (`ehmpathy.prod.AWS_PROFILE`).

---

## recommendation: option D (env.all + env overrides)

option D balances DRY with explicit env scope. `env.all` makes it explicit that keys apply to all envs.

### spec structure

```yaml
# keyrack.yml

org: ehmpathy  # which org these keys belong to

# keys for ALL envs
env.all:
  - XAI_API_KEY: encrypted
  - DATADOG_API_KEY: encrypted

# env-specific keys
env.prod:
  - AWS_PROFILE: ephemeral
  - STRIPE_SECRET_KEY: encrypted

env.prep:
  - AWS_PROFILE: ephemeral
  - STRIPE_SECRET_KEY: encrypted

env.test:
  - TEST_DB_URL  # no grade = no requirement (plaintext ok)
```

- `org` declares which organization these keys belong to
- envs are inferred from `env.*:` sections (except `env.all`)

### grade shorthand

| syntax | what it means |
|--------|---------------|
| `- KEY: encrypted` | requires grade.protection = encrypted |
| `- KEY: ephemeral` | requires grade.duration = ephemeral or better |
| `- KEY: encrypted,ephemeral` | requires both |
| `- KEY` | no requirement (plaintext acceptable) |

no `plaintext` keyword — absence of grade requirement implies plaintext is acceptable.

### slug resolution

slugs follow the format: `$org.$env.$key`

| declared key | org | env | resolved slug |
|--------------|-----|-----|---------------|
| `XAI_API_KEY` (env.all) | ehmpathy | prod | `ehmpathy.prod.XAI_API_KEY` |
| `XAI_API_KEY` (env.all) | ehmpathy | prep | `ehmpathy.prep.XAI_API_KEY` |
| `XAI_API_KEY` (env.all) | ehmpathy | test | `ehmpathy.test.XAI_API_KEY` |
| `AWS_PROFILE` (env.prod) | ehmpathy | prod | `ehmpathy.prod.AWS_PROFILE` |
| `AWS_PROFILE` (env.prep) | ehmpathy | prep | `ehmpathy.prep.AWS_PROFILE` |
| `TEST_DB_URL` (env.test) | ehmpathy | test | `ehmpathy.test.TEST_DB_URL` |

different orgs have different keys for the same env:

| org | env | slug |
|-----|-----|------|
| ehmpathy | prod | `ehmpathy.prod.AWS_PROFILE` |
| ahbode | prod | `ahbode.prod.AWS_PROFILE` |

### backwards compat

if no `env.*:` sections exist, the file behaves like today — flat keys, no env concept:

```yaml
# keyrack.yml (no envs)
keys:
  XAI_API_KEY: encrypted
  AWS_PROFILE: encrypted,ephemeral
```

slugs are just `XAI_API_KEY`, `AWS_PROFILE` (no `.env` suffix). unlock/get work without `--env` flag.

### host map

```yaml
# keyrack.host.yml

keys:
  ehmpathy.prod.XAI_API_KEY:
    vault: 1password
    item: "XAI API Key (Production)"
  ehmpathy.prep.XAI_API_KEY:
    vault: 1password
    item: "XAI API Key (Prep)"
  ehmpathy.test.XAI_API_KEY:
    vault: os.direct  # test key can be plaintext
  ehmpathy.prod.AWS_PROFILE:
    vault: aws.sso
    profile: ehmpathy.prod
  ehmpathy.prep.AWS_PROFILE:
    vault: aws.sso
    profile: ehmpathy.prep
  ahbode.prod.AWS_PROFILE:
    vault: aws.sso
    profile: ahbode.prod
```

---

## command surface

### unlock with env filter

```sh
# unlock only prep keys
$ rhx keyrack unlock --env prep
🔓 keyrack unlock (org: ehmpathy, env: prep)
   ├─ ehmpathy.prep.XAI_API_KEY (expires in 8h)
   ├─ ehmpathy.prep.AWS_PROFILE (expires in 8h)
   └─ ✨ 2 keys unlocked

# unlock only test keys
$ rhx keyrack unlock --env test
🔓 keyrack unlock (org: ehmpathy, env: test)
   ├─ ehmpathy.test.XAI_API_KEY (expires in 8h)
   ├─ ehmpathy.test.TEST_DB_URL (expires in 8h)
   └─ ✨ 2 keys unlocked

# unlock all envs (rare, for admin tasks)
$ rhx keyrack unlock --env all
```

### get with env filter

```sh
# get prep keys for integration tests
$ source rhx keyrack get --for repo --env prep
🔐 done. 2 granted via os.daemon (env: prep)

# get test keys for unit tests
$ source rhx keyrack get --for repo --env test
🔐 done. 2 granted via os.daemon (env: test)
```

### default env

worksite can declare a default env:

```yaml
# keyrack.yml
default.env: prep  # or from KEYRACK_ENV env var

env.all:
  - XAI_API_KEY: encrypted

env.prod:
  - AWS_PROFILE: ephemeral

env.prep:
  - AWS_PROFILE: ephemeral
```

then:

```sh
$ rhx keyrack unlock  # uses default.env (prep)
$ rhx keyrack unlock --env prod  # explicit override
```

or via env var:

```sh
$ KEYRACK_ENV=prod rhx keyrack unlock
```

---

## export behavior

when keys are exported, the env suffix is stripped:

```sh
$ source rhx keyrack get --for repo --env prep
# exports:
#   XAI_API_KEY=sk-prep-xxx  (not ehmpathy.prep.XAI_API_KEY)
#   AWS_ACCESS_KEY_ID=...
#   AWS_SECRET_ACCESS_KEY=...
```

the tool sees `XAI_API_KEY`, not `ehmpathy.prep.XAI_API_KEY`. this is intentional:
- tools expect standard env var names
- env selection happens at unlock/get time, not at tool runtime
- no code changes needed in tools

---

## cicd integration

cicd runners typically operate in one env at a time:

```yaml
# .github/workflows/test.yml
jobs:
  test:
    env:
      KEYRACK_ENV: test
    steps:
      - run: source rhx keyrack get --for repo  # uses KEYRACK_ENV

  deploy-prep:
    env:
      KEYRACK_ENV: prep
    steps:
      - run: source rhx keyrack get --for repo
      - run: npm run deploy
```

---

## security considerations

### env isolation

prod keys and prep keys are separate slugs. unlock of prep does not unlock prod:

```sh
$ rhx keyrack unlock --env prep
# ehmpathy.prep.AWS_PROFILE unlocked, ehmpathy.prod.AWS_PROFILE NOT unlocked

$ source rhx keyrack get --for repo --env prod
🔐 status: 🔒 locked
   └─ required keys not in daemon: ehmpathy.prod.AWS_PROFILE, ehmpathy.prod.XAI_API_KEY
```

this prevents accidental prod access when you work in prep.

### grade requirements per env

different envs can have different grade requirements:

```yaml
env.prod:
  - DB_PASSWORD: encrypted  # prod db password MUST be encrypted

env.test:
  - DB_PASSWORD  # test db password can be plaintext (local db)
```

---

## migration path

### phase 1: env support in spec

add `env.<name>:` sections to keyrack.yml. prior flat `keys:` become base keys (available in all envs). envs are inferred from `env.*:` sections — no explicit list needed.

### phase 2: env flag in commands

add `--env` flag to `unlock` and `get`. without flag, uses `default.env` or errors if not set.

### phase 3: deprecate env-in-slug convention

once env support is stable, deprecate the `KEY_PROD` name convention. guide users to migrate:

```yaml
# before
keys:
  AWS_PROFILE_PROD: encrypted,ephemeral
  AWS_PROFILE_PREP: encrypted,ephemeral

# after
env.prod:
  - AWS_PROFILE: ephemeral

env.prep:
  - AWS_PROFILE: ephemeral
```

---

## summary

| aspect | recommendation |
|--------|----------------|
| term | `env` (not scope, stage, tier) |
| structure | option D: `env.all` + env overrides |
| org declaration | `org: ehmpathy` at top of keyrack.yml |
| section syntax | `env.all:`, `env.prod:`, `env.prep:`, `env.test:` |
| key syntax | `- KEY: grade` or `- KEY` (no grade = plaintext ok) |
| list format | keys are list items under each `env.*:` |
| env list | inferred from `env.*:` sections (except `env.all`) |
| slug format | `$org.$env.$key` (e.g., `ehmpathy.prod.AWS_PROFILE`) |
| export behavior | strip org+env prefix (tools see `AWS_PROFILE`) |
| default env | `default.env` in spec or `KEYRACK_ENV` env var |
| filter | `--env prod`, `--env prep`, `--env test` |
| backwards compat | no `env.*:` sections = flat keys, no env concept |

> org + env + key = full slug. unlock filters by env. get exports without prefix. orgs and envs stay isolated. 🔐
