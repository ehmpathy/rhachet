# self-review r6: has-contract-output-variants-snapped

## sixth pass: deeper look at snapshot coverage

r5 identified one minor gap: 1password set error case lacks snapshot. let me examine whether this needs remediation.

---

## re-examination: 1password set error case

the test case:

```typescript
when('[t0] set with invalid exid format', () => {
  const result = useBeforeAll(async () => {
    if (!opAvailable) {
      return { status: 0, stdout: '{}', stderr: '', skipped: true };
    }
    return invokeRhachetCliBinary({...});
  });

  then('exits with non-zero status', () => {
    if ((result as any).skipped) { ... }
    expect(result.status).not.toEqual(0);
  });

  then('error mentions secret reference uri', () => {
    if ((result as any).skipped) { ... }
    const output = result.stdout + result.stderr;
    expect(output).toMatch(/secret reference uri|op:\/\//i);
  });
});
```

**why snapshot would be problematic:**
1. test is conditional — skips when op not installed
2. snapshot would capture `{}` when skipped (false signal)
3. actual error output varies by op cli version/state
4. explicit assertions verify the important content

**verdict:** no snapshot needed. explicit assertions are sufficient for this conditional test.

---

## re-examination: all snapshot coverage

| contract | variant | snapped? | why |
|----------|---------|----------|-----|
| os.daemon set | success json | yes | stable output |
| os.daemon get | success json | yes | stable output |
| os.daemon get | absent json | yes | stable output |
| os.daemon unlock | lost human | yes | stable output |
| 1password list | json | yes | stable output |
| 1password list | human | yes | stable output |
| 1password get | locked json | yes | stable output |
| 1password set | error | no | conditional test, explicit assertions |
| 1password set | success | no | conditional test, op cli required |

---

## why the gaps are acceptable

### 1password set error (no snapshot)

- test is conditional on op cli presence
- snapshot of skipped case would be noise
- explicit assertions verify error content
- reviewer can see test logic without snapshot

### 1password set success (no snapshot)

- requires real op cli and auth
- cannot reliably snapshot in ci without credentials
- test validates format acceptance, not output

---

## conclusion

all stable outputs are snapped. conditional tests use explicit assertions instead of snapshots.

the snapshot strategy is intentional:
- snapshot stable outputs for vibecheck
- use explicit assertions for conditional/environment-dependent outputs

holds.

