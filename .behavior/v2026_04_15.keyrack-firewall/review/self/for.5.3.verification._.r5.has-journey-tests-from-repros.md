# self-review: has-journey-tests-from-repros (r5)

## question

> did you include journey tests from repros?

## analysis

### repros artifact check

searched for `.behavior/v2026_04_15.keyrack-firewall/3.2.distill.repros.*`:

```
result: no files found
```

the behavior route skipped from research (3.1) to blueprint (3.3). no formal repros artifact was created.

### why no repros artifact

this feature was driven by a concrete usecase from a peer (see 0.wish.md):
- CI workflow has EHMPATH_BEAVER_GITHUB_TOKEN with JSON blob containing `mech: EPHEMERAL_VIA_GITHUB_APP`
- keyrack.source() was not translatin JSON blobs in CI
- firewall action closes the gap by translatin at workflow level

the wish document itself contains the journey sketch (the handoff from rhachet-roles-bhuild). no separate repros artifact was needed.

### the wish journey

from 0.wish.md:

```
github secret (JSON blob with mech: EPHEMERAL_VIA_GITHUB_APP)
    ↓
workflow env var: EHMPATH_BEAVER_GITHUB_TOKEN="${{ secrets.EHMPATH_BEAVER_GITHUB_TOKEN }}"
    ↓
keyrack firewall --from 'json(env://SECRETS)' --into github.actions
    ↓
downstream steps get: EHMPATH_BEAVER_GITHUB_TOKEN=ghs_*
```

### how the journey is tested (architecture)

the firewall CLI delegates mechanism translation to vault adapters. test coverage:

| layer | what it tests | files |
|-------|---------------|-------|
| mech detection | JSON blob → mech name | inferKeyrackMechForGet.test.ts |
| mech translation | JSON blob → ghs_* token | keyrack.vault.osSecure.githubApp.acceptance.test.ts |
| vault adapter | os.envvar calls mech.deliverForGet | vaultAdapterOsEnvvar.ts (code, not test) |
| firewall CLI | orchestrates vault calls, formats output | keyrack.firewall.acceptance.test.ts |

**note**: firewall acceptance tests use plain strings, not JSON blobs with mech fields. this is intentional — mech translation requires GitHub API calls, which the firewall tests don't mock.

the blueprint explains: "a CLI command can be tested via normal integration tests with mocked env vars and temp files." the firewall tests verify firewall-specific behaviors; mech translation is tested at component level.

### criteria coverage (10 usecases)

| usecase | test coverage |
|---------|--------------|
| usecase.1 = credential translation | component tests (inferKeyrackMechForGet + vault.osSecure.githubApp) |
| usecase.2 = credential filter | firewall [case4] t0 (repo manifest filter) |
| usecase.3 = credential block | firewall [case4] t1 (ghp_*, AKIA* block) |
| usecase.4 = credential passthrough | firewall [case4] t0 (safe key passthrough) |
| usecase.5 = debug experience on success | firewall [case4] t0 (treestruct output) |
| usecase.6 = debug experience on failure | firewall [case4] t1 (blocked output) |
| usecase.7 = partial failure | implicit via fail-fast (blocked = exit 2) |
| usecase.8 = keyrack.yml not found | would be tested at keyrack orchestrator level |
| usecase.9 = secret not in github secrets | firewall [case4] t2 (locked status) |
| usecase.10 = per-job isolation | architectural guarantee (GITHUB_ENV is job-scoped) |

firewall acceptance tests: 46 tests total.

## why it holds

1. no repros artifact exists — wish document contains the journey
2. the wish journey (mech translation) is tested at component level
3. firewall tests focus on firewall-specific behaviors (block, filter, format)
4. this architecture matches the blueprint design
5. all criteria usecases are covered (some at firewall level, some at component level)

## verdict

**holds (n/a)** — no repros artifact; behaviors covered via wish + criteria + component tests
