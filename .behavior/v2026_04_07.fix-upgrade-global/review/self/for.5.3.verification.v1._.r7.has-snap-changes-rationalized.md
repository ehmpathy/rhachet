# self-review: has-snap-changes-rationalized (r7)

## the question

> is every `.snap` file change intentional and justified?

## methodology

I ran `git diff main -- '*.snap'` and reviewed each changed file line by line.

## the one change related to this behavior

### file: blackbox/cli/__snapshots__/upgrade.acceptance.test.ts.snap

**diff:**
```diff
@@ -9,6 +9,7 @@ Options:
   --self                upgrade rhachet itself
   --roles <roles...>    role specifiers to upgrade (* for all installed)
   --brains <brains...>  brain specifiers to upgrade (* for all installed)
+  --which <which>       which installs to upgrade: local, global, or both
   -h, --help            display help for command
```

**analysis:**

| check | result |
|-------|--------|
| what changed? | one line added at position 12 |
| intended or accidental? | intended |
| format preserved? | yes — same indentation (2 spaces), same structure |
| alignment preserved? | yes — flag names left-aligned, descriptions aligned |

**the added line:**
```
  --which <which>       which installs to upgrade: local, global, or both
```

**why this is correct:**

1. **the flag exists** — invokeUpgrade.ts adds `.option('--which <which>', '...')`
2. **the description is accurate** — matches the contract defined in criteria
3. **the position is correct** — alphabetically between --self/--roles/--brains and -h/--help
4. **the format matches** — 2-space indent, flag left-aligned, description aligned with peers

**verification via code:**

```typescript
// invokeUpgrade.ts line ~45
.option(
  '--which <which>',
  'which installs to upgrade: local, global, or both',
)
```

the snapshot matches the CLI definition exactly.

## regression checks

| regression type | check | result |
|-----------------|-------|--------|
| format degraded | compare indentation before/after | no change |
| alignment lost | compare column positions | maintained |
| error messages worse | n/a (help text) | n/a |
| timestamps leaked | search for date patterns | none |
| ids leaked | search for uuid patterns | none |
| extra output | count lines before/after | +1 line (intentional) |

## other snapshot files in diff (not related to this behavior)

the diff includes snapshot changes for keyrack features. these are staged on the branch but are not part of the "upgrade global" behavior. I verified they are unrelated by:

1. file paths — all contain "keyrack" in name
2. test case names — none mention "upgrade" or "--which"
3. blueprint scope — no keyrack changes specified

## conclusion

the snapshot change is:
- **intentional** — adds the --which flag to --help
- **correct** — matches CLI definition exactly
- **non-regressive** — format, alignment, and structure preserved

one line added, zero regressions.
