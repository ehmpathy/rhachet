# self-review r3: has-acceptance-test-citations

## question: does each playtest step have acceptance test coverage?

---

## playtest → acceptance test citation map

### part 1: os.daemon vault

| playtest step | acceptance test file | test case |
|---------------|---------------------|-----------|
| 1.1 set to daemon | `keyrack.vault.osDaemon.acceptance.test.ts` | `[case1] [t0] keyrack set --key DAEMON_KEY --vault os.daemon` |
| 1.2 get from daemon | `keyrack.vault.osDaemon.acceptance.test.ts` | `[case1] [t1] keyrack get after set --vault os.daemon` |
| 1.3 list shows daemon key | `keyrack.vault.osDaemon.acceptance.test.ts` | `[case5] [t0] set key then check list` |

**citations:**

1.1 → lines 30-76: tests `set --vault os.daemon`, asserts `mech: EPHEMERAL_VIA_SESSION` and `vault: os.daemon`

1.2 → lines 78-138: tests `get` after set, asserts `status: granted` and secret value

1.3 → lines 336-382: tests `list --json`, asserts key appears with `vault: os.daemon` and `mech: EPHEMERAL_VIA_SESSION`

### part 2: 1password vault

| playtest step | acceptance test file | test case |
|---------------|---------------------|-----------|
| 2.1 set with 1password | `keyrack.vault.1password.acceptance.test.ts` | `[case1] [t1] set with valid exid format` |
| 2.2 unlock 1password key | — | not directly tested (requires real op cli auth) |
| 2.3 get 1password key | `keyrack.vault.1password.acceptance.test.ts` | `[case3] [t0] get without unlock` (locked state) |

**citations:**

2.1 → lines 75-111: tests `set --vault 1password --exid op://...`, validates format acceptance

2.2 → **gap identified**: unlock with real 1password auth requires human interaction (biometric). covered by playtest, not automatable.

2.3 → lines 196-242: tests get status (locked without unlock). full grant flow requires real op cli auth.

### part 3: edge cases

| playtest step | acceptance test file | test case |
|---------------|---------------------|-----------|
| 3.1 op cli not installed | `keyrack.vault.1password.acceptance.test.ts` | `[case6] [t0] set --vault 1password without op cli` |
| 3.2 invalid exid | `keyrack.vault.1password.acceptance.test.ts` | `[case1] [t0] set with invalid exid format` |
| 3.3 daemon key after relock | `keyrack.vault.osDaemon.acceptance.test.ts` | `[case3] [t0] set key then relock then get` |

**citations:**

3.1 → lines 319-383: tests exit code 2 and install instructions when op cli absent

3.2 → lines 25-73: tests invalid exid format rejection

3.3 → lines 208-265: tests ephemeral key cleared after relock, status=absent

---

## gaps identified

### gap 1: 1password unlock with real auth

**playtest step:** 2.2 unlock 1password key

**why not automated:** requires real 1password authentication (biometric or password). automated tests skip this when op cli not authenticated.

**resolution:** playtest covers this manually. automated tests verify the locked→get behavior and format validation.

### gap 2: 1password get after successful unlock

**playtest step:** 2.3 get 1password key (after unlock)

**why not automated:** depends on successful unlock which requires real auth.

**resolution:** playtest covers the full flow. automated tests verify locked state behavior.

---

## assessment

| playtest step | has acceptance test | notes |
|---------------|--------------------:|-------|
| 1.1 os.daemon set | yes | full coverage |
| 1.2 os.daemon get | yes | full coverage |
| 1.3 os.daemon list | yes | full coverage |
| 2.1 1password set | yes | format validation covered |
| 2.2 1password unlock | no | requires real auth |
| 2.3 1password get | partial | locked state covered |
| 3.1 op cli absent | yes | exit code + instructions |
| 3.2 invalid exid | yes | format rejection |
| 3.3 daemon after relock | yes | ephemeral clear |

---

## conclusion

7/9 playtest steps have full or partial acceptance test coverage. the 2 gaps (1password unlock and authenticated get) are intentional — they require human interaction with 1password that cannot be automated.

the playtest and acceptance tests are complementary:
- acceptance tests verify automatable behaviors
- playtest verifies human-interaction flows

holds.
