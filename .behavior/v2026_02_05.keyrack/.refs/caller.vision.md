# vision: pat-for-cicd (github app tokens via credential firewall)

> replace the banned pat with short-lived tokens from the bhuild-beaver github app, resolved through `rhachet/keyrack` — a universal credential firewall that guarantees only short-lived tokens reach downstream processes

---

## the outcome world

### before: the banned pat

vlad merges a feature for radio task dispatch via gh.issues. tests pass locally, ci is green. life is good.

then github flags the pat as a bot. the token is banned. ci turns red overnight. acceptance tests that push/pull radio tasks to the demo repo fail with auth errors. vlad can't run integration tests locally either — the same pat was shared across both environments.

a single long-lived secret, shared between local dev and ci, becomes a single point of failure. when it dies, all of it dies. and there's no safety net — any process that touches the env can see the raw credential.

### after: credential firewall via `rhachet/keyrack`

vlad pushes a commit. ci kicks off. the `rhachet/keyrack` step reads `BHUILD_DEMO_REPO_ACCESS_GITHUB_TOKEN` (a JSON blob with app credentials), mints a fresh 1-hour token, and writes it to `$GITHUB_ENV`. the original secret never reaches the test steps. tests run. token expires.

locally, vlad does the same:

```sh
source use.keyrack.sh
npm run test:acceptance -- skill.radio.task.push.via-gh-issues
```

`use.keyrack.sh` loads credentials, detects which ones are long-lived, resolves them into short-lived tokens, unsets the originals, and exports only the resolved values. no long-lived credential ever reaches a child process.

### the "aha" moment

> "the keyrack isn't just a credential loader — it's a firewall. it reads raw credentials, resolves them into the shortest-lived form possible, and refuses to pass through what it can't translate. tests never see private keys. ci never leaks long-lived tokens. one gate, both environments."

---

## user experience

### usecase 1: developer runs tests locally

**goal**: developer sources keyrack, gets only short-lived tokens, runs tests

**timeline**:
1. one-time setup: add credentials to `~/.config/rhachet/keyrack.env`
2. before test run: `source use.keyrack.sh`
3. keyrack detects each credential type, resolves long-lived → short-lived
4. exports only resolved values, unsets originals
5. tests run — only short-lived tokens in env

**contract**:
```sh
# ~/.config/rhachet/keyrack.env (one-time setup)
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export TAVILY_API_KEY=tvly-...
export BHUILD_DEMO_REPO_ACCESS_GITHUB_TOKEN='{"appId":"123456","privateKey":"-----BEGIN RSA PRIVATE KEY-----\n...","owner":"ehmpathy"}'
```

```sh
# before tests
source use.keyrack.sh

# output:
# 🔐 rhachet/keyrack
# ├─ OPENAI_API_KEY ··· pass (api key, no short-lived alt)
# ├─ ANTHROPIC_API_KEY ··· pass (api key, no short-lived alt)
# ├─ TAVILY_API_KEY ··· pass (api key, no short-lived alt)
# ├─ BHUILD_DEMO_REPO_ACCESS_GITHUB_TOKEN ··· resolved (github app → 1h token)
# │  ├─ as: bhuild-beaver[bot]
# │  ├─ org: ehmpathy
# │  └─ repos: rhachet-roles-bhuild-demo
# └─ done. 4 keys loaded, 1 resolved, 0 blocked.

npm run test:acceptance -- skill.radio.task.push.via-gh-issues
# BHUILD_DEMO_REPO_ACCESS_GITHUB_TOKEN = ghs_... (short-lived)
# the JSON blob with the private key is gone from env
```

### usecase 2: ci runs tests via credential firewall

**goal**: ci passes raw secrets to keyrack step, keyrack resolves and sanitizes, test steps only see short-lived tokens

**timeline**:
1. github repo stores `BHUILD_DEMO_REPO_ACCESS_GITHUB_TOKEN` as a JSON blob secret
2. test workflow passes raw secret only to the `rhachet/keyrack` step
3. keyrack resolves → writes short-lived token to `$GITHUB_ENV`
4. subsequent test steps see only the resolved token — original secret never in their env
5. tests run with fresh 1-hour token

**contract**:
```yaml
# in .test.yml, per test job

# step 1: keyrack resolves credentials
# raw secret is ONLY visible to this step
- name: resolve credentials
  uses: rhachet/keyrack@v1
  env:
    BHUILD_DEMO_REPO_ACCESS_GITHUB_TOKEN: ${{ secrets.BHUILD_DEMO_REPO_ACCESS_GITHUB_TOKEN }}
  # internally:
  #   detects JSON app creds → mints short-lived token
  #   writes: echo "BHUILD_DEMO_REPO_ACCESS_GITHUB_TOKEN=ghs_..." >> $GITHUB_ENV
  #   original secret stays in this step only

# step 2: tests see only the resolved token via $GITHUB_ENV
- name: test:integration
  run: npm run test:integration
  # no env: block — BHUILD_DEMO_REPO_ACCESS_GITHUB_TOKEN already in env from $GITHUB_ENV
  # value is ghs_... (short-lived), not the JSON blob
```

**key insight**: the raw secret (JSON with private key) is only in the keyrack step's `env:`. it never appears in `$GITHUB_ENV`. only the resolved short-lived token does. subsequent steps have zero access to the private key.

**what `.test.yml` looks like**:
```yaml
# no changes to the secret name — still BHUILD_DEMO_REPO_ACCESS_GITHUB_TOKEN
# no new vars or secrets — same single secret, just a different value (JSON instead of pat)
# one new step per job: rhachet/keyrack resolve
```

### usecase 3: keyrack as universal credential firewall

**goal**: every credential goes through the keyrack gate — no raw long-lived credential ever reaches a downstream process

**the guarantee**:

| credential type detected | keyrack behavior |
|---|---|
| github app creds (JSON with `appId` + `privateKey`) | resolve → short-lived installation token, export token |
| short-lived token (e.g., `ghs_...`) | pass through |
| long-lived pat (`ghp_...`) | **fail fast** — refuse to export, block the run |
| api key with no short-lived alt (e.g., `sk-...`) | pass through with note (can't translate) |
| unrecognized format | pass through with note |

the keyrack enforces a **minimum-privilege, minimum-lifespan** policy:
- if a credential can be translated to a shorter-lived form → translate it
- if a credential is long-lived and translatable but raw → block it (force the safe path)
- if a credential has no short-lived alternative → pass it through (api keys, etc.)

this means: once a repo adopts the keyrack, you **cannot accidentally leak a long-lived github credential** to tests or ci processes. the firewall catches it.

### usecase 4: future — rhachet keyrack store

**goal**: when rhachet keyrack store ships, credential storage moves from env files to the store — but the firewall contract stays the same

**timeline**:
1. `use.keyrack.sh` reads from rhachet keyrack store instead of `keyrack.env`
2. same firewall logic: detect, resolve, sanitize
3. `BHUILD_DEMO_REPO_ACCESS_GITHUB_TOKEN` contract unchanged — downstream tests never notice

the current design is forward-compatible: the credential source changes, but the firewall layer and the test contract stay stable.

---

## mental model

### how developers describe it to a friend

> "we have a credential firewall called rhachet/keyrack. you give it your raw credentials — api keys, github app private keys, whatever. it figures out which ones can be turned into short-lived tokens, resolves them, and only exports the short-lived versions. the raw credentials never reach your tests or ci processes. same tool locally and in github actions."

### key clarification: private key is per-app, not per-installation

the bhuild-beaver github app has **one** private key (at the app level). the **installation** on `ehmpathy` org scoped to `rhachet-roles-bhuild-demo` controls which repos the token can access. so:

- store the app private key once (in the JSON blob)
- the installation guarantees the minted token can only touch the demo repo
- no need for separate keys per repo or per environment

### the firewall analogy

```
raw credentials (long-lived, broad)
        │
        ▼
 ┌──────────────┐
 │   rhachet    │  detect → resolve → sanitize
 │   keyrack   │
 │  (firewall)  │  blocks: long-lived pats
 └──────┬───────┘  resolves: app creds → short-lived tokens
        │          passes: api keys (no alt)
        ▼
 short-lived tokens only
        │
        ▼
   tests / ci processes
```

### analogies that fit

| analogy               | maps to                                               |
| --------------------- | ----------------------------------------------------- |
| airport security      | keyrack firewall (inspect, resolve, block contraband) |
| hotel keycard machine | `getGithubTokenFromGithubAppKey()` (mints keycards)   |
| passport              | app private key (proves identity, not used directly)   |
| flight pass           | short-lived token (scoped, expires, used directly)     |
| customs declaration   | JSON blob (declares what credentials you have)         |
| contraband detector   | pat detection → fail fast                             |

### terms: developer vs system

| developer says              | system says                                             |
| --------------------------- | ------------------------------------------------------- |
| "load my keys"              | `source use.keyrack.sh`                                |
| "the demo repo token"       | `BHUILD_DEMO_REPO_ACCESS_GITHUB_TOKEN`                  |
| "resolve credentials"       | `rhachet/keyrack` firewall step                        |
| "mint a token"              | `getGithubTokenFromGithubAppKey()` in `src/infra/`      |
| "block long-lived creds"    | keyrack detects `ghp_...` → fail fast                  |
| "ci token for tests"        | same env var, resolved by keyrack before tests run     |

---

## what changes

### new: `rhachet/keyrack` (credential firewall)

| component                       | detail                                                             |
| ------------------------------- | ------------------------------------------------------------------ |
| `use.keyrack.sh` (local)       | replaces `use.apikeys.sh` — loads, resolves, sanitizes, exports    |
| `rhachet/keyrack@v1` (ci)      | github action — reads secrets, resolves, writes to `$GITHUB_ENV`   |
| `src/infra/getGithubTokenFromGithubAppKey.ts` | resolves JSON app creds → short-lived installation token |
| credential type detection        | inspects each env var to determine if resolvable                   |
| fail-fast on raw long-lived pats | `ghp_...` detected → block, refuse to export                      |
| silent unset of raw credentials  | after resolve, originals removed from env without trace            |

### ci/cd changes

| file                           | change                                                         |
| ------------------------------ | -------------------------------------------------------------- |
| `.github/workflows/.test.yml`  | add `rhachet/keyrack@v1` step per test job (before test steps)|
| `.github/workflows/.test.yml`  | remove `env: BHUILD_DEMO_REPO_ACCESS_GITHUB_TOKEN` from test steps (now in `$GITHUB_ENV`) |
| `.github/workflows/test.yml`   | no change to secret passthrough — still `BHUILD_DEMO_REPO_ACCESS_GITHUB_TOKEN` |
| `.github/workflows/publish.yml`| same keyrack step for test jobs                                |

### github repo config changes

| config                                          | change                                            |
| ----------------------------------------------- | ------------------------------------------------- |
| `secrets.BHUILD_DEMO_REPO_ACCESS_GITHUB_TOKEN`  | update value: pat → JSON blob with app credentials |

one secret, same name, new value format. zero new vars or secrets to add.

### new prodcode

| file                                            | detail                                              |
| ----------------------------------------------- | --------------------------------------------------- |
| `src/infra/getGithubTokenFromGithubAppKey.ts`   | JWT sign via Node `crypto`, call GitHub API for installation token |

### no other prodcode changes needed

the prior prodcode (`getGithubTokenByAuthArg.ts`, `daoRadioTaskViaGhIssues.ts`, etc.) already works with any token passed via `BHUILD_DEMO_REPO_ACCESS_GITHUB_TOKEN`. the keyrack resolves the JSON blob into a plain token before tests run — downstream code never sees the JSON.

---

## evaluation

### how well does it solve the goals?

| goal                              | solution                                                  | score       |
| --------------------------------- | --------------------------------------------------------- | ----------- |
| unblock ci (banned pat)           | app token replaces pat                                    | ✅ excellent |
| local test auth                   | `use.keyrack.sh` resolves app creds → short-lived token  | ✅ excellent |
| ci test auth                      | `rhachet/keyrack@v1` resolves before tests               | ✅ excellent |
| portable across environments      | one env var, same JSON blob, same resolution logic        | ✅ excellent |
| credential security               | firewall guarantees no long-lived creds reach tests       | ✅ excellent |
| narrow permissions                | issues:write + metadata:read only (installation-scoped)   | ✅ excellent |
| short-lived tokens                | 1 hour max, minted fresh each run                         | ✅ excellent |
| minimal workflow changes           | one new step per job, same secret name                    | ✅ excellent |
| no prodcode changes (downstream)  | env var contract unchanged                                | ✅ excellent |
| forward-compatible                | keyrack store replaces env file later                    | ✅ excellent |

### pros

- **credential firewall**: no long-lived credential reaches downstream processes, ever
- **no more bot flags**: app tokens are designed for automation; pats are not
- **narrow scope**: issues:write on one demo repo only — least privilege
- **short-lived**: 1 hour tokens vs indefinite pat lifespan
- **one env var**: `BHUILD_DEMO_REPO_ACCESS_GITHUB_TOKEN` stays the same, just polymorphic value
- **same secret name in ci**: no new vars or secrets to add — just update the value
- **identical local and ci path**: keyrack firewall works the same in both
- **blocks raw pats**: if someone tries to use a `ghp_...` token, keyrack refuses — forces the safe path
- **infrastructure exists**: bhuild-beaver app already provisioned, Node `crypto` handles JWT

### cons

- **new component**: `rhachet/keyrack` needs to be built (action + local shell)
- **one-time local setup**: developers add app credentials to `keyrack.env` (once)
- **JSON blob in secret**: slightly unusual, but cleaner than multiple vars

### edgecases and pit of success

| edgecase                            | pit of success design                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| app not installed on demo repo      | token resolution fails loud with clear error from github api                 |
| private key rotated                 | update one secret value (JSON blob); all environments auto-heal              |
| token expires mid-test              | 1 hour is 6x longer than typical test suite (~10 min)                        |
| developer forgets local setup       | `use.keyrack.sh` prints clear instructions with required vars               |
| someone sets a raw pat as the value | keyrack detects `ghp_...` → **fail fast**, refuses to export                |
| private key in child process env    | keyrack resolves and unsets before children start — private key never leaks  |
| JSON blob logged in ci              | github actions auto-masks `secrets.*` values in logs                         |
| app permissions changed             | declastruct detects drift via `provision/github.apps/`                       |
| future keyrack store migration     | swap credential source; firewall layer and test contract unchanged           |

---

## summary

`rhachet/keyrack` is a universal credential firewall. it reads raw credentials (JSON app creds, api keys, tokens), resolves long-lived ones into the shortest-lived form possible, blocks what it can't trust, and exports only the sanitized values. tests and ci processes never see private keys or raw pats.

for this wish: store the bhuild-beaver app credentials as a JSON blob in `BHUILD_DEMO_REPO_ACCESS_GITHUB_TOKEN`. the keyrack detects the JSON, mints a 1-hour installation token via `getGithubTokenFromGithubAppKey()`, and exports just the token. same env var name, same downstream contract, one new firewall step.

> credentials go in. only keycards come out. 🔐
