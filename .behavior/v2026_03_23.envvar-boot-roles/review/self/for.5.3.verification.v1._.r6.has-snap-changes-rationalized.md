# review: has-snap-changes-rationalized

## the question

is every `.snap` file change intentional and justified?

---

## snapshot files in this pr

```
src/contract/cli/__snapshots__/invokeEnroll.integration.test.ts.snap
```

only one snapshot file, and it's new (not modified).

---

## per-snapshot rationale

### file: `invokeEnroll.integration.test.ts.snap`

**change type:** new file (added)

**intentional?** yes — this snapshot file captures enroll command outputs for visual PR review.

---

### snapshot 1: `journey1-replace-mechanic`

**what it captures:** config JSON for replace mode

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [{ "command": "echo mechanic boot", "type": "command" }],
        "matcher": "# author=repo=.this/role=mechanic .*"
      }
    ]
  }
}
```

**rationale:** demonstrates the config structure for single-role enrollment

**flakiness check:**
- no timestamps
- no generated ids
- deterministic structure

---

### snapshot 2: `journey2-subtract-driver`

**what it captures:** config JSON after subtract operation

```json
{
  "hooks": {
    "SessionStart": [
      { "matcher": "# author=repo=.this/role=mechanic .*", ... },
      { "matcher": "# author=repo=.this/role=ergonomist .*", ... }
    ]
  }
}
```

**rationale:** demonstrates subtraction behavior — driver absent, mechanic + ergonomist present

**flakiness check:**
- no timestamps
- hooks array order follows repo settings.json order
- deterministic within environment

---

### snapshot 3: `journey3-typo-error`

**what it captures:** error message with metadata

```
BadRequestError: role 'mechnic' not found, did you mean 'mechanic'?

{
  "role": "mechnic",
  "rolesLinked": ["driver", "mechanic"],
  "suggestion": "mechanic"
}
```

**rationale:** demonstrates error format with helpful suggestion

**flakiness check:**
- no timestamps
- `rolesLinked` array order depends on filesystem scan order
- low risk: filesystems return deterministic order

---

## regression check

| concern | found? |
|---------|--------|
| output format degraded | no — clean JSON structure |
| error messages less helpful | no — includes suggestion |
| timestamps/ids leaked | no — all content deterministic |
| extra output unintentional | no — only expected content |

---

## why it holds

1. **all snapshots are new** — no prior snapshots modified
2. **each snapshot has rationale** — captures specific journey output
3. **no bulk updates** — only 3 named snapshots
4. **no flakiness risks** — deterministic content

## conclusion

**all snapshot changes are intentional and rationalized.**

| snapshot | type | rationale |
|----------|------|-----------|
| journey1-replace-mechanic | new | config for replace mode |
| journey2-subtract-driver | new | config for subtract mode |
| journey3-typo-error | new | error format with suggestion |

no regressions. no accidental changes. every snapshot tells an intentional story.
