# review: behavior-declaration-coverage

## question

for each usecase in the blackbox criteria, ask:
- is there a test that covers this behavior?
- is the test at the correct level (unit, integration, acceptance)?

## review

### blackbox criteria coverage

| usecase | description | test coverage |
|---------|-------------|---------------|
| usecase.1 | github app set with os.secure | mechAdapterGithubApp.test.ts |
| usecase.2 | github app set with 1password | vaultAdapter1Password.test.ts |
| usecase.3 | aws sso set with aws.config | vaultAdapterAwsConfig.integration.test.ts |
| usecase.4 | github app unlock transforms to token | mechAdapterGithubApp.test.ts |
| usecase.5 | incompatible vault/mech fails fast | vaultAdapterOsDirect.test.ts |
| usecase.6 | aws sso with os.secure fails fast | vaultAdapterOsSecure.integration.test.ts |
| usecase.7 | single org auto-selects | mechAdapterGithubApp.test.ts |
| usecase.8 | single app auto-selects | mechAdapterGithubApp.test.ts |
| usecase.9 | gh cli unavailable fallback | mechAdapterGithubApp.test.ts |
| usecase.10 | explicit --mech skips inference | inferKeyrackMechForSet tests |
| usecase.11 | invalid pem path | mechAdapterGithubApp.test.ts |
| usecase.12 | malformed pem content | mechAdapterGithubApp.test.ts |
| usecase.13 | vault infers from key name | inferKeyrackVaultFromKey.test.ts |
| usecase.14 | vault inference impossible | inferKeyrackVaultFromKey.test.ts |

### test level verification

| level | files | coverage |
|-------|-------|----------|
| unit | *.test.ts | mech/vault adapter contracts |
| integration | *.integration.test.ts | full set/get flows |
| acceptance | keyrack.*.acceptance.test.ts | extant blackbox tests |

### test results

from execution record:
```
Test Suites: 35 passed, 35 total
Tests:       20 skipped, 877 passed, 897 total
```

all tests pass.

### conclusion

all 14 usecases from blackbox criteria have test coverage.
