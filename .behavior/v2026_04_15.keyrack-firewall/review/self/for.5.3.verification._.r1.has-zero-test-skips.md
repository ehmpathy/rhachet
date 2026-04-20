# self-review: has-zero-test-skips

## question

did you verify zero skips — and REMOVE any you found?

## review

### scan for forbidden patterns

searched for `.skip()` and `.only()` in keyrack.firewall.acceptance.test.ts:

```
grep -E '\.skip\(|\.only\(' blackbox/cli/keyrack.firewall.acceptance.test.ts
# result: no matches found
```

### silent credential bypasses

no patterns like `if (!credentials) return` found in firewall tests. all tests execute their assertions unconditionally.

### prior failures carried forward

no known-broken tests. all 46 firewall acceptance tests pass:
- exit 0
- 46 passed, 0 failed, 0 skipped

## gaps found

none. firewall tests have zero skips, zero only(), zero silent bypasses.

## note on other tests

skips exist in other unrelated test files (actor, enroll, etc.) but these are not part of the keyrack-firewall behavior scope.

## conclusion

zero skips in firewall tests. all tests run and pass.
