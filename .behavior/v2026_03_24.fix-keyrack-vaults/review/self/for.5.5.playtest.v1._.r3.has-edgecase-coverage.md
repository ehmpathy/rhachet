# self-review r3: has-edgecase-coverage

## deeper pass: enumerate all possible edge cases and verify coverage

r2 documented the 3 edge cases in playtest. this pass enumerates all edge cases and verifies each is covered or justifiably omitted.

---

## complete edge case enumeration

### os.daemon vault

| edge case | covered? | justification |
|-----------|----------|---------------|
| set to daemon when daemon not active | yes | implicit — daemon auto-starts |
| get from daemon when key absent | yes | edge 3.3 |
| get from daemon when daemon not active | no | automated tests cover this |
| key expiration (9h limit) | no | impractical for byhand — wait 9h? |
| set same key twice (upsert) | no | automated tests cover this |

### 1password vault

| edge case | covered? | justification |
|-----------|----------|---------------|
| op cli not installed | yes | edge 3.1 |
| op cli not authenticated | no | prerequisites require auth |
| invalid exid format | yes | edge 3.2 |
| exid points to deleted item | no | would require delete in 1password |
| roundtrip validation fails | yes | edge 3.2 |
| 1password re-auth required | implicit | unlock step handles this |

### boundary conditions

| boundary | covered? | test id |
|----------|----------|---------|
| first key ever set | yes | 1.1, 2.1 |
| second key to same vault | no | automated tests cover |
| key retrieval immediately after set | yes | 1.2, 2.3 |
| key retrieval after session ends | yes | edge 3.3 |

---

## why omissions are acceptable

### impractical for byhand test

| omission | why impractical |
|----------|-----------------|
| key expiration | requires 9h wait |
| daemon not active | requires process management |
| 1password item deleted | requires destructive action in 1password |

### covered by automated tests

the automated acceptance tests cover all edge cases that are impractical for byhand verification:
- `keyrack.vault.osDaemon.acceptance.test.ts` — 20 tests
- `keyrack.vault.1password.acceptance.test.ts` — 21 tests

---

## edge cases in playtest

| test id | edge case | observable outcome |
|---------|-----------|-------------------|
| edge 3.1 | op cli not installed | exit 2, install instructions |
| edge 3.2 | invalid exid | roundtrip fails |
| edge 3.3 | daemon key after relock | status: absent |

these 3 edge cases cover the most likely user errors:
1. dependency not installed
2. bad input data
3. expected behavior after session ends

---

## conclusion

edge cases are covered for what is practical in a byhand test. impractical cases (wait 9h, delete in 1password) are covered by automated tests.

holds.
