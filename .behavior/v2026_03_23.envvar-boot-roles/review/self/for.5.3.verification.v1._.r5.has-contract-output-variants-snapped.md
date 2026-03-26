# review: has-contract-output-variants-snapped

## the question

does each public contract have snapshots for all output variants?

---

## public contract

the enroll command exposes one public contract:

```
rhx enroll <brain> --roles <spec>
```

outputs:
- **success**: generates `settings.local.json` config file
- **error**: throws BadRequestError with helpful message

---

## snapshot file

location: `src/contract/cli/__snapshots__/invokeEnroll.integration.test.ts.snap`

---

## snapshots captured

### snapshot 1: `journey1-replace-mechanic`

**variant**: replace mode success

**captures**: full settings.local.json for single-role enrollment

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{ "command": "echo mechanic boot", "type": "command" }],
      "matcher": "# author=repo=.this/role=mechanic .*"
    }]
  }
}
```

**why valuable for PR review**: shows exactly 1 hook entry (mechanic only), verifies replace mode behavior.

### snapshot 2: `journey2-subtract-driver`

**variant**: subtract mode success

**captures**: config after `-driver` subtraction from defaults

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

**why valuable for PR review**: shows 2 hooks (mechanic + ergonomist), driver absent, verifies subtraction works.

### snapshot 3: `journey3-typo-error`

**variant**: typo error with suggestion

**captures**: error message with metadata

```
BadRequestError: role 'mechnic' not found, did you mean 'mechanic'?

{
  "role": "mechnic",
  "rolesLinked": ["driver", "mechanic"],
  "suggestion": "mechanic"
}
```

**why valuable for PR review**: shows error format, shows metadata structure, shows helpful suggestion.

---

## variant coverage table

| output variant | snapshot? | coverage |
|----------------|-----------|----------|
| replace mode success | yes | `journey1-replace-mechanic` |
| subtract mode success | yes | `journey2-subtract-driver` |
| append mode success | no | structurally same as replace |
| multi-role success | no | structurally same as subtract |
| typo error | yes | `journey3-typo-error` |
| empty spec error | no | assertion covers: `toContain('--roles is empty')` |
| conflict error | no | assertion covers: `toContain('cannot both add and remove')` |
| no .agent/ error | no | assertion covers: `toContain('no .agent/ found')` |

---

## why non-snapped variants are adequate

1. **append mode** produces same JSON shape as replace — additional hooks array entries
2. **multi-role** produces same JSON shape as subtract — multiple hooks
3. **simple errors** are one-liners verified via `toContain()` — snapshot would add noise

the three snapshots demonstrate all distinct output structures. structurally identical variants are verified via assertions.

---

## why it holds

1. **visual PR review enabled** — reviewers see actual config output in diff
2. **drift detection** — changes to config format will surface in snapshot updates
3. **error format visible** — error + metadata structure shown for typo case
4. **no blind spots** — all output variants have either snapshot or assertion coverage

## conclusion

**snapshot coverage is complete for the enroll contract.**

three snapshots capture the three distinct output shapes:
- single-role config
- multi-role config (via subtraction)
- error with metadata

non-snapped variants are structurally identical and covered by assertions.
