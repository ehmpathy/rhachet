# self-review: has-snap-changes-rationalized (r6)

## the question

> is every `.snap` file change intentional and justified?

## snapshot changes in this behavior

the git diff shows multiple snapshot changes. only ONE is related to this behavior:

### upgrade.acceptance.test.ts.snap (RELATED)

**what changed:**
```diff
+  --which <which>       which installs to upgrade: local, global, or both
```

**was this intentional?** YES

**rationale:** this behavior adds the `--which` flag to `rhachet upgrade`. the snapshot captures the --help output which now includes this new flag.

**verification:**
- the flag text matches the CLI option definition in invokeUpgrade.ts
- the description is accurate: "which installs to upgrade: local, global, or both"
- no other lines in the --help output changed

### other snapshot files (UNRELATED)

the diff shows new/modified snapshot files that are NOT part of this behavior:

| file | status | related to this behavior? |
|------|--------|---------------------------|
| keyrack.get.output.acceptance.test.ts.snap | NEW | no — keyrack feature |
| keyrack.source.cli.acceptance.test.ts.snap | NEW | no — keyrack feature |
| keyrack.source.acceptance.test.ts.snap | MODIFIED | no — keyrack feature |
| vaultAdapter1Password.test.ts.snap | NEW | no — keyrack feature |
| asShellEscapedSecret.test.ts.snap | NEW | no — keyrack feature |

these files are staged because the branch includes other work, but they are out of scope for this behavior review.

## checklist for upgrade.acceptance.test.ts.snap

| check | result |
|-------|--------|
| output format degraded? | no — same alignment, same structure |
| error messages less helpful? | n/a — this is --help output |
| timestamps/ids leaked? | no — static help text |
| extra output added unintentionally? | no — only the --which line was added |

## conclusion

the snapshot change is intentional and correct:
- ONE line added: `--which <which>` flag in --help output
- the change reflects the new CLI contract
- no regressions in format or clarity
