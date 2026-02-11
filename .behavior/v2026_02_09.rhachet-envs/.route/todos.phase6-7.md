# phase 6-7 todos: acceptance test gaps + snapshot gaps

ref: blueprint `.behavior/v2026_02_09.rhachet-envs/3.3.blueprint.v1.i1.md`

---

## acceptance test gaps

### fixture needed

- [x] create `with-keyrack-multi-env/` fixture
  - keyrack.yml with `org: testorg`, `env.all`, `env.prod`, `env.prep`
  - `.rhachet/keyrack.manifest.json` with host configs for prod + prep keys
  - `.rhachet/keyrack.direct.json` with values for prod + prep keys

- [x] create `with-keyrack-flat-keys/` fixture
  - keyrack.yml with old `keys:` format for rejection test

### new acceptance test file: `keyrack.envs.acceptance.test.ts`

- [x] uc3: unlock with --env filter (case5)
- [x] uc4: get with --env filter (case2)
- [x] uc5: set with --org mismatch (case6)
- [x] uc6: list with env awareness (case8)
- [x] uc7: export preserves raw key names (case3)
- [x] uc8: env isolation security (case4)
- [x] uc9: --env required when env-specific sections exist (case1)
- [x] uc11: flat keys: rejection (case7)

---

## snapshot gaps

add `.toMatchSnapshot()` to all tests that produce stdout but lack snapshots:

- [x] `keyrack.cli.acceptance.test.ts` — 1 snapshot added (list --json)
- [x] `keyrack.set.acceptance.test.ts` — 1 snapshot added (list after set)
- [x] `keyrack.validation.acceptance.test.ts` — 6 snapshots added (stderr for errors + json for all-or-none)
- [x] `keyrack.allowlist.acceptance.test.ts` — 2 snapshots added (get --for repo + env var)
- [x] `keyrack.firewall.acceptance.test.ts` — 2 snapshots added (get --for repo + env var ghp)
- [x] `keyrack.vault.osDirect.acceptance.test.ts` — 4 snapshots added (get --for repo, rhx, list --json)
- [x] `keyrack.vault.osSecure.acceptance.test.ts` — 7 snapshots added (list, set, locked, findsert)
- [x] `keyrack.daemon.acceptance.test.ts` — 5 snapshots added (cache miss, passphrase, mid-session, priority)
- [x] `keyrack.envs.acceptance.test.ts` — 16 snapshots (created with test file)
- [x] `keyrack.session.acceptance.test.ts` — skipped (output varies by daemon state)

---

## progress

- [x] all unit tests pass (1111 passed)
- [x] all acceptance tests pass (227 passed, 64 snapshots)
- [x] types pass
- [x] acceptance test gaps covered (8 usecases via keyrack.envs.acceptance.test.ts)
- [x] snapshot gaps covered (28 new snapshots across 8 files)
- [x] final stability verification run (without RESNAP) — 227 passed, 64 snapshots matched
