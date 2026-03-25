# self-review r1: has-zero-test-skips

## question: did you verify zero skips?

---

## verification

### vault adapter tests (os.daemon, 1password)

```bash
grep -r "\.skip\|\.only" src/domain.operations/keyrack/adapters/vaults/
# result: no matches
```

no `.skip()` or `.only()` found in vault adapter test files.

### vault acceptance tests

```bash
grep "\.skip\|\.only" blackbox/cli/*vault*.ts
# result: only keyrack.vault.awsIamSso.acceptance.test.ts:474
```

one skip found — but in aws.iam.sso vault, unrelated to this pr (os.daemon and 1password).

### enweaveOneFanout test (cleanup verification)

```bash
grep "\.only" src/domain.operations/weave/enweaveOneFanout.integration.test.ts
# result: no matches
```

`.only()` was removed — confirmed clean.

---

## silent credential bypasses

no silent bypasses in vault tests. the 1password tests properly skip when op cli is absent:

- `if (opAvailable)` checks are explicit, not silent
- tests report "skipped 1password integration tests: op cli not available"
- this is intentional conditional execution, not a bypass

---

## prior failures carried forward

the verification checklist documents prior failures in other tests:
- `keyrack.recipient.acceptance.test.ts` — age encryption issues, unrelated
- `envAllHostStrategies.integration.test.ts` — age encryption issues, unrelated

these are not new failures and not related to vault adapter changes.

---

## conclusion

- no `.skip()` or `.only()` in vault adapter tests
- no `.skip()` or `.only()` in os.daemon or 1password acceptance tests
- enweaveOneFanout `.only()` removed
- one skip in aws.iam.sso tests — unrelated to this pr
- no silent credential bypasses
- prior failures are unrelated age encryption issues

holds.

