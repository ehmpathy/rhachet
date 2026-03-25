# self-review r4: has-self-run-verification

## question: did each playtest step execute as expected?

---

## steps verified

### part 1: os.daemon vault

| step | command | expected | actual | result |
|------|---------|----------|--------|--------|
| 1.1 | `./bin/rhx keyrack set --key PLAYTEST_DAEMON_KEY --vault os.daemon --env test` | mech=EPHEMERAL_VIA_SESSION, vault=os.daemon | mech=EPHEMERAL_VIA_SESSION, vault=os.daemon | pass |
| 1.2 | `./bin/rhx keyrack get --key PLAYTEST_DAEMON_KEY --env test` | status=granted | status=granted | pass |
| 1.3 | `./bin/rhx keyrack list --json` | key appears with vault=os.daemon | key appears with vault=os.daemon, mech=EPHEMERAL_VIA_SESSION | pass |

### part 2: 1password vault

| step | command | expected | actual | result |
|------|---------|----------|--------|--------|
| 2.1 | set with 1password | mech=REFERENCE, vault=1password | skipped | op cli not installed |
| 2.2 | unlock 1password key | fetches to daemon | skipped | requires op cli |
| 2.3 | get 1password key | status=granted | skipped | requires op cli |

**why skipped:** 1password steps require op cli to be installed and authenticated. machine does not have op cli. acceptance tests cover these flows via mocked op cli.

### part 3: edge cases

| step | command | expected | actual | result |
|------|---------|----------|--------|--------|
| 3.1 | `./bin/rhx keyrack set --key X --vault 1password --env test` | exit 2, install instructions | exit 2, shows ubuntu install instructions | pass |
| 3.2 | set with invalid exid | exit 2, roundtrip fails | skipped | requires op cli |
| 3.3 | get daemon key after relock | status=absent | status=absent | pass |

---

## execution log

### step 1.1: set to daemon

```
$ ./bin/rhx keyrack set --key PLAYTEST_DAEMON_KEY --vault os.daemon --env test

enter secret for PLAYTEST_DAEMON_KEY: ********

🔐 keyrack set (org: ehmpathy, env: test)
   └─ ehmpathy.test.PLAYTEST_DAEMON_KEY
      ├─ mech: EPHEMERAL_VIA_SESSION
      └─ vault: os.daemon
```

### step 1.2: get from daemon

```
$ ./bin/rhx keyrack get --key PLAYTEST_DAEMON_KEY --env test

🔐 keyrack
   └─ ehmpathy.test.PLAYTEST_DAEMON_KEY
      ├─ vault: os.daemon
      ├─ mech: EPHEMERAL_VIA_SESSION
      └─ status: granted 🔑
```

### step 1.3: list shows daemon key

```json
{
  "slug": "ehmpathy.test.PLAYTEST_DAEMON_KEY",
  "exid": null,
  "vault": "os.daemon",
  "mech": "EPHEMERAL_VIA_SESSION",
  "env": "test",
  "org": "ehmpathy"
}
```

### step 3.1: op cli not installed

```
$ ./bin/rhx keyrack set --key PLAYTEST_1P_KEY --vault 1password --env test

🔐 keyrack set
   └─ ✗ op cli not found

   to install on ubuntu:
   ...

exit code: 2
```

### step 3.3: daemon key after relock

```
$ ./bin/rhx keyrack relock
🔒 keyrack relock
   └─ ehmpathy.test.PLAYTEST_DAEMON_KEY: pruned 🔒

$ ./bin/rhx keyrack get --key PLAYTEST_DAEMON_KEY --env test --json | jq '.status'
"absent"
```

---

## coverage summary

| category | total | verified | skipped | pass rate |
|----------|-------|----------|---------|-----------|
| os.daemon | 3 | 3 | 0 | 100% |
| 1password | 3 | 0 | 3 | n/a (requires op cli) |
| edge cases | 3 | 2 | 1 | 67% (1 requires op cli) |
| **total** | 9 | 5 | 4 | 56% (100% of verifiable) |

---

## why this is acceptable

1. **os.daemon flows are 100% verified** — the primary usecase
2. **constraint error path verified** — step 3.1 confirms fail-fast when op cli absent
3. **1password flows covered by acceptance tests** — `keyrack.vault.1password.acceptance.test.ts` has 21 tests with mocked op cli
4. **skipped steps require external dependency** — op cli installation is outside test scope

---

## conclusion

all verifiable playtest steps pass. the 4 skipped steps require 1password cli which is not installed on this machine. acceptance tests provide coverage for those flows.

holds.
