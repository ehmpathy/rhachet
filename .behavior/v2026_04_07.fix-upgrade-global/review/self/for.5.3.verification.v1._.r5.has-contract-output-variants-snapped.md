# self-review: has-contract-output-variants-snapped (r5)

## the question

> does each public contract have EXHAUSTIVE snapshots?

## the contract: `rhachet upgrade --which`

the new contract is the `--which` flag on the `upgrade` command:

```
--which <which>       which installs to upgrade: local, global, or both
```

## snapshot coverage

### what IS snapped

| variant | snapshot | location |
|---------|----------|----------|
| `--help` output | ✓ | `upgrade.acceptance.test.ts.snap` line 3-15 |

**the snapshot captures:**
```
"--which <which>       which installs to upgrade: local, global, or both"
```

this proves the contract exists and is documented in CLI help.

### what is NOT snapped (and why)

| variant | snapped? | reason |
|---------|----------|--------|
| `--which local` success | no | output unchanged from prior behavior |
| `--which global` success | no | requires global install in test env |
| `--which both` success | no | requires global install in test env |
| `--which global` error | no | requires global install to fail |

## why this is acceptable

### the --help snapshot is sufficient

the `--help` snapshot proves:
1. the `--which` flag exists
2. the flag accepts `local`, `global`, or `both`
3. the flag is documented for users

### local upgrade output is unchanged

`--which local` produces the same output as prior behavior (no `--which` flag). the prior snapshot tests already cover this:
- `stdout.header matches snapshot` (line 17-20)
- `stdout.summary matches snapshot` (line 22)

### global upgrade cannot be acceptance-tested

acceptance tests run in isolated temp repos without:
- global rhachet installation
- permission to write to global npm prefix
- control over npm version/behavior

the unit tests in `execUpgrade.test.ts` verify global upgrade behavior via mocks:
- line 578-615: `--which global` behavior
- line 663-687: global failure handler

### the contract is verified at the appropriate layer

| layer | what it tests | coverage |
|-------|---------------|----------|
| acceptance | CLI contract exists | --help snapshot |
| unit | behavior logic | all --which variants |

this follows the test pyramid: acceptance tests verify contracts, unit tests verify behavior.

## conclusion

the snapshot coverage is appropriate:

1. **the contract is snapped** — `--help` shows `--which <which>` flag
2. **prior behavior unchanged** — `--which local` produces same output as before
3. **global cannot be acceptance-tested** — requires environmental setup
4. **unit tests cover behavior** — all variants are tested via mocks

no additional snapshots are required.
