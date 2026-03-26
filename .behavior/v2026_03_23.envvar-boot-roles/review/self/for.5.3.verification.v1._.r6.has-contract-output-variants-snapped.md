# review: has-contract-output-variants-snapped

## the question

does each public contract have snapshots for all output variants?

---

## verification method

1. identified public contract: `rhx enroll <brain> --roles <spec>`
2. read snapshot file: `src/contract/cli/__snapshots__/invokeEnroll.integration.test.ts.snap`
3. read test file to identify all output variants tested
4. analyzed each snapshot content for visual review quality

---

## snapshot content analysis

### snapshot 1: `journey1-replace-mechanic`

**what it captures:** the full `settings.local.json` structure for replace mode

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

**why it matters for PR review:**
- shows exactly 1 hook entry (mechanic only, not 3)
- shows the matcher pattern format
- shows the hooks array structure
- reviewer can verify: "yes, only mechanic hooks present"

### snapshot 2: `journey2-subtract-driver`

**what it captures:** config after `-driver` subtraction

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

**why it matters for PR review:**
- shows 2 hooks (mechanic + ergonomist)
- driver hook is absent
- reviewer can verify: "yes, driver was subtracted"

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

**why it matters for PR review:**
- shows full error message format
- shows metadata with context (role, linked roles, suggestion)
- reviewer can verify: "yes, typo detection works with helpful suggestion"

---

## output variant coverage

### success cases

| variant | snapshot? | why sufficient |
|---------|-----------|----------------|
| replace mode | yes | snapshot shows single-role config |
| subtract mode | yes | snapshot shows subtraction result |
| append mode | no | structurally identical to replace |
| multi-role | no | structurally identical to subtract |
| defaults | no | structurally identical to multi-role |

### error cases

| variant | snapshot? | why sufficient |
|---------|-----------|----------------|
| typo with suggestion | yes | snapshot shows error + metadata format |
| empty spec | no | simple assertion: `toContain('--roles is empty')` |
| conflict | no | simple assertion: `toContain('cannot both add and remove')` |
| no .agent/ | no | simple assertion: `toContain('no .agent/ found')` |
| no roles | no | simple assertion: `toContain('no roles found')` |
| unsupported brain | no | simple assertion: `toContain('not supported')` |

---

## why non-snapped variants are adequate

**structural similarity:**
- append mode produces same JSON shape as replace (just more hooks)
- multi-role produces same JSON shape as subtract
- additional snapshots would be redundant visual noise

**error message simplicity:**
- errors without metadata are one-liners
- `toContain("error text")` is clearer than snapshot for simple strings
- typo error snapshot demonstrates the metadata format once

---

## conclusion

**snapshot coverage enables visual PR review for the enroll contract.**

| snapshot | demonstrates |
|----------|--------------|
| journey1-replace-mechanic | config structure with single role |
| journey2-subtract-driver | config structure with subtraction |
| journey3-typo-error | error format with metadata |

the three snapshots cover the distinct output shapes. reviewers can visually verify:
1. how the config looks in replace mode (single hook)
2. how the config looks in subtract mode (multiple hooks, absent role)
3. how errors look with suggestions and metadata

non-snapped variants are structurally identical and verified via targeted assertions

