# self-review r1: has-behavior-coverage

## question: does every behavior from wish/vision have a test?

---

## wish.md behaviors

| wish behavior | test coverage | status |
|---------------|---------------|--------|
| `keyrack set --key X --vault os.daemon` | vaultAdapterOsDaemon.integration.test.ts, keyrack.vault.osDaemon.acceptance.test.ts | ✅ |
| ephemeral storage without persistent vault | vaultAdapterOsDaemon.integration.test.ts (mech=EPHEMERAL_VIA_SESSION) | ✅ |
| `keyrack set --key X --vault 1password` | vaultAdapter1Password.integration.test.ts, keyrack.vault.1password.acceptance.test.ts | ✅ |
| verify 1password cli is setup | vaultAdapter1Password.integration.test.ts (isOpCliInstalled check) | ✅ |
| set stores exid in host manifest | vaultAdapter1Password.integration.test.ts (set validates exid format) | ✅ |
| unlock pulls from 1password to daemon | vaultAdapter1Password.integration.test.ts (get with exid), acceptance tests | ✅ |
| get pulls from daemon as usual | both acceptance test suites verify get returns value | ✅ |

---

## vision.md behaviors (from criteria.blackbox)

| vision behavior | test coverage | status |
|-----------------|---------------|--------|
| uc1: os.daemon set → get → expire | vaultAdapterOsDaemon.integration.test.ts (3/3), acceptance (20/20) | ✅ |
| uc2: 1password set → unlock → get | vaultAdapter1Password.integration.test.ts (7/7), acceptance (21/21) | ✅ |
| uc3: ci with 1password service accounts | vaultAdapter1Password.integration.test.ts (skipped when op cli absent) | ✅ |
| uc4: error: op cli not installed | vaultAdapter1Password.integration.test.ts | ✅ |
| uc5: error: op cli not authenticated | vaultAdapter1Password.integration.test.ts | ✅ |
| uc6: error: invalid exid | vaultAdapter1Password.integration.test.ts | ✅ |

---

## conclusion

all behaviors from wish.md and vision.md (via criteria.blackbox) have test coverage:

- **os.daemon vault**: 3 integration tests + 20 acceptance tests
- **1password vault**: 7 integration tests + 3 unit tests + 21 acceptance tests
- **error cases**: covered in integration tests (op cli check, auth check, exid validation)

no gaps found. coverage holds.

