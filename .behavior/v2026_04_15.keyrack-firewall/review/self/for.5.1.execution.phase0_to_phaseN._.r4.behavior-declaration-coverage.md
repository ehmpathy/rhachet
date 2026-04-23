# behavior-declaration-coverage review (r4) — keyrack firewall

## review question

for each requirement in the behavior declaration (vision, criteria, blueprint):
- is the requirement implemented?
- is the implementation complete?
- are there any gaps?

---

## vision requirements

### CLI command structure

| requirement | status | evidence |
|-------------|--------|----------|
| `npx rhachet keyrack firewall --env test --from 'json(env://SECRETS)' --into github.actions` | **implemented** | `invokeKeyrack.ts:1373-1508` — full subcommand |
| `--env` flag (required) | **implemented** | line 1377, validated at lines 1392-1397 |
| `--from` flag (required) | **implemented** | line 1378-1381, parsed via `asKeyrackFirewallSource` |
| `--into` flag (required) | **implemented** | line 1382, validated at lines 1399-1405 |
| `--owner` flag (optional) | **implemented** | line 1383 with default "default" |

### input sources

| requirement | status | evidence |
|-------------|--------|----------|
| `json(env://VAR)` | **implemented** | `asKeyrackFirewallSource.ts` + CLI lines 1411-1419 |
| `json(stdin://*)` | **implemented** | `asKeyrackFirewallSource.ts` + CLI lines 1420-1426 |

### output formats

| requirement | status | evidence |
|-------------|--------|----------|
| `github.actions` — `::add-mask::` | **implemented** | `getKeyrackFirewallOutput.ts:99` |
| `github.actions` — `$GITHUB_ENV` write | **implemented** | `getKeyrackFirewallOutput.ts:107` via `writeToGithubEnv` |
| `github.actions` — `::notice::` for expiry | **implemented** | `getKeyrackFirewallOutput.ts:102-103` |
| `github.actions` — multiline heredoc | **implemented** | `writeToGithubEnv` lines 15-28 |
| `json` — structured output | **implemented** | `getKeyrackFirewallOutput.ts:109-111` |

### key insight fixes

| requirement | status | evidence |
|-------------|--------|----------|
| vaults return `KeyrackKeyGrant \| null` | **implemented** | `KeyrackHostVaultAdapter.ts:20` |
| ghs_* removed from LONG_LIVED_PATTERNS | **implemented** | `mechAdapterReplica.ts:21-22` explicit comment |
| detect mech from JSON blob | **implemented** | `inferKeyrackMechForGet.ts` |

---

## criteria requirements (10 usecases)

### usecase.1 — credential translation

| criterion | status | evidence |
|-----------|--------|----------|
| JSON blob with mech → translated token | **implemented** | CLI phase 1: `getKeyrackKeyGrant` uses mech inference |
| original blob not visible | **implemented** | translated value returned, not source |
| token masked in logs | **implemented** | `::add-mask::` output |

### usecase.2 — credential filter

| criterion | status | evidence |
|-----------|--------|----------|
| only keyrack.yml keys processed | **implemented** | CLI line 1459-1462: `getAllKeyrackSlugsForEnv` filters |
| keyrack.yml is source of truth | **implemented** | filter uses manifest |

### usecase.3 — credential blocked

| criterion | status | evidence |
|-----------|--------|----------|
| ghp_* blocked | **implemented** | `mechAdapterReplica.ts` LONG_LIVED_PATTERNS |
| AKIA* blocked | **implemented** | `mechAdapterReplica.ts` LONG_LIVED_PATTERNS |
| blocked status with reason | **implemented** | treestruct output shows reasons |
| fix suggestion | **implemented** | `getKeyrackFirewallOutput.ts:76` reasons field |

### usecase.4 — credential passthrough

| criterion | status | evidence |
|-----------|--------|----------|
| secrets without mech pass through | **implemented** | `inferKeyrackMechForGet` returns PERMANENT_VIA_REPLICA |
| passthrough secrets masked | **implemented** | all grants get `::add-mask::` |

### usecase.5 — debug experience on success

| criterion | status | evidence |
|-----------|--------|----------|
| treestruct output | **implemented** | `getKeyrackFirewallOutput.ts:43-83` |
| mechanism shown | **implemented** | line 67 |
| expiry shown | **implemented** | lines 68-69 |
| granted status | **implemented** | line 71 |

### usecase.6 — debug experience on failure

| criterion | status | evidence |
|-----------|--------|----------|
| malformed JSON → parse error | **implemented** | CLI lines 1433-1440 |
| unknown mech → fail fast | **implemented** | mech adapter throws |
| API error → shows which key failed | **implemented** | grant attempt tracks slug |

### usecase.7 — multiple secrets with partial failure

| criterion | status | evidence |
|-----------|--------|----------|
| fail fast if any blocked | **implemented** | CLI lines 1478-1486: checks blocked count, exits 2 |
| none exported on partial failure | **implemented** | grants only emitted in PHASE 3 after validation |

### usecase.8 — keyrack.yml not found

| criterion | status | evidence |
|-----------|--------|----------|
| fail with hint | **implemented** | CLI lines 1452-1456 |

### usecase.9 — secret not in github secrets

| criterion | status | evidence |
|-----------|--------|----------|
| reports absent | **implemented** | treestruct shows absent status |
| does NOT fail | **implemented** | absent keys don't trigger exit 2 |

### usecase.10 — per-job isolation

| criterion | status | evidence |
|-----------|--------|----------|
| $GITHUB_ENV is job-scoped | **inherent** | GitHub Actions behavior, not code |

---

## blueprint components

| component | status | location |
|-----------|--------|----------|
| `asKeyrackFirewallSource.ts` | **implemented** | `src/domain.operations/keyrack/` |
| `asKeyrackSlugParts.ts` | **implemented** | `src/domain.operations/keyrack/` |
| `inferKeyrackMechForGet.ts` | **implemented** | `src/domain.operations/keyrack/` |
| `getKeyrackFirewallOutput.ts` | **implemented** | `src/domain.operations/keyrack/` |
| firewall subcommand | **implemented** | `invokeKeyrack.ts:1373-1508` |
| acceptance tests | **implemented** | `blackbox/cli/keyrack.firewall.acceptance.test.ts` |

---

## test coverage verification

| test case | status | evidence |
|-----------|--------|----------|
| `--into json`: safe key granted | **covered** | test case4 t0 |
| `--into json`: ghp_* blocked | **covered** | test case4 t1 |
| `--into json`: absent keys ok | **covered** | test case4 t2 |
| `--from json(stdin://*)` | **covered** | test case4 t3 |
| `--env` required | **covered** | test case4 t4 |
| `--from` required | **covered** | test case4 t5 |
| `--into` required | **covered** | test case4 t6 |
| firewall via os.envvar | **covered** | test case3 |
| `--allow-dangerous` bypass | **covered** | test case2 |

---

## gaps found

**none found.**

all vision requirements, criteria, and blueprint components are implemented.

---

## conclusion

the behavior declaration is fully covered:
- 5/5 CLI flags implemented
- 2/2 input sources implemented
- 5/5 output format features implemented
- 3/3 key insight fixes implemented
- 10/10 usecases covered
- 6/6 blueprint components implemented
- 9/9 test cases covered

no gaps require a fix.
