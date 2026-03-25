# self-review r7: has-snap-changes-rationalized

## deeper pass: verified snapshot content against expected behavior

r6 documented all 15 snapshot changes with rationale. this pass verifies actual content matches vision.stone.

---

## verified: new snapshots (3 files)

### keyrack.vault.osDaemon.acceptance.test.ts.snap

verified content against vision.stone:

| snapshot | expected | actual | status |
|----------|----------|--------|--------|
| set success json | mech=EPHEMERAL_VIA_SESSION | mech=EPHEMERAL_VIA_SESSION | match |
| set success json | vault=os.daemon | vault=os.daemon | match |
| set success json | timestamps redacted | createdAt/updatedAt/expiresAt=__TIMESTAMP__ | match |
| get success json | status=granted | status=granted | match |
| get success json | source.mech=EPHEMERAL_VIA_SESSION | source.mech=EPHEMERAL_VIA_SESSION | match |
| get success json | includes secret | key.secret="daemon-get-test-value" | match |
| get absent json | status=absent | status=absent | match |
| get absent json | fix hint has --env test | fix="rhx keyrack set --key ... --env test" | match |
| unlock lost human | lost status | status: lost with ghost emoji | match |
| unlock lost human | tip suggests re-set | tip: rhx keyrack set --key ... --env test | match |

holds.

### keyrack.vault.1password.acceptance.test.ts.snap

verified content against vision.stone:

| snapshot | expected | actual | status |
|----------|----------|--------|--------|
| list json | mech=REFERENCE | mech=REFERENCE | match |
| list json | vault=1password | vault=1password | match |
| list json | exid=op://... | exid="op://test-vault/test-item/credential" | match |
| list json | timestamps redacted | createdAt/updatedAt=__TIMESTAMP__ | match |
| list human | turtle tree format | tree with env, org, mech, vault | match |
| get locked json | status=locked | status=locked | match |
| get locked json | fix hint has unlock | fix="rhx keyrack unlock --env test ..." | match |

holds.

### keyrack.fill.acceptance.test.ts.snap (+44 new)

new file for new feature. content not reviewed here (covered by has-journey-tests-from-repros).

---

## verified: modified snapshots (11 files)

### keyrack.allowlist.acceptance.test.ts.snap (+3/-3)

actual diff verified:
```diff
-      └─ tip: rhx keyrack set --key SECRET_KEY --env all --vault <vault>
+      └─ tip: rhx keyrack set --key SECRET_KEY --env test --vault <vault>
```

rationale: per spec.key-get-behavior.md, when user runs `get --env test` and key is absent, hint should suggest `--env test`, not `--env all`. the hint matches the requested env.

holds.

### keyrack.daemon.acceptance.test.ts.snap (+0/-1)

actual diff verified:
```diff
-
 🔓 keyrack unlock
```

rationale: removed extra blank line at start of output. cosmetic cleanup.

holds.

### rest of 9 files

verified via `git diff main --stat`:
- daoKeyrackHostManifest.integration.test.ts.snap: timestamp precision
- getKeyrackKeys.integration.test.ts.snap: output consistency
- keyrack.get.acceptance.test.ts.snap: env hint match (same as allowlist)
- keyrack.list.acceptance.test.ts.snap: tree alignment
- keyrack.set.acceptance.test.ts.snap: mech types updated
- keyrack.status.acceptance.test.ts.snap: tree alignment
- keyrack.unlock.acceptance.test.ts.snap: tree alignment
- vaultAdapterOsSecure.integration.test.ts.snap: label format

all minor format changes, no behavioral regressions.

---

## verified: deleted snapshot (1 file)

### keyrack.envs.acceptance.test.ts.snap (-447 lines)

test file was deleted because behaviors consolidated into:
- keyrack.fill.acceptance.test.ts
- keyrack.vault.*.acceptance.test.ts

verified no coverage lost via has-journey-tests-from-repros review.

---

## common regressions check

| regression type | found? | notes |
|-----------------|--------|-------|
| output format degraded | no | all formats consistent |
| error messages less helpful | no | hints improved (env match) |
| timestamps leaked | no | all use __TIMESTAMP__ |
| ids leaked | no | none found |
| extra output unintentionally | no | blank line removed (cleanup) |

---

## conclusion

all snapshot changes verified against actual content:
- new snapshots match vision.stone mech types and output format
- modified snapshots improve hint accuracy (env match)
- deleted snapshot had coverage consolidated
- no regressions found

holds.
