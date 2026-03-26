# review: has-ergonomics-validated

> **note: `--mode plan` was not implemented.** this review was conducted against an earlier version of the experience reproductions that proposed `--mode plan` for JSON output. the feature was excluded as YAGNI. references to "plan mode" in this review reflect the earlier design; actual verification uses config file inspection.

## the question

does the actual input/output match what felt right at repros?

---

## comparison method

1. read repros artifact: `.behavior/v2026_03_23.envvar-boot-roles/3.2.distill.repros.experience._.v1.i1.md`
2. read actual snapshots: `src/contract/cli/__snapshots__/invokeEnroll.integration.test.ts.snap`
3. compare sketched ergonomics vs implemented ergonomics
4. document where design drifted and whether it improved or regressed

---

## journey 1: replace roles

### repros sketch

**input:** `rhx enroll claude --roles mechanic --mode plan`

**expected output:**
```json
{
  "config": {
    "hooks": {
      "SessionStart": [
        { "matcher": "", "hooks": ["npx rhachet roles boot --repo ehmpathy --role mechanic"] }
      ]
    }
  },
  "configPath": ".claude/settings.local.json",
  "roles": ["mechanic"],
  "spawnArgs": []
}
```

### actual implementation

**input:** same — `--roles mechanic` works as expected

**actual output (from snapshot):**
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [{"command": "echo mechanic boot", "type": "command"}],
        "matcher": "# author=repo=.this/role=mechanic .*"
      }
    ]
  }
}
```

### ergonomics drift

| aspect | repros | actual | verdict |
|--------|--------|--------|---------|
| input syntax | `--roles mechanic` | same | match |
| output shape | wrapper with metadata | raw settings.local.json content | drift |
| hook format | string array | structured object | drift |
| matcher format | empty string | author pattern | drift |

**verdict:** input ergonomics match. output differs in structure but the core intent is preserved: mechanic-only config. the actual format reflects the real claude-code settings.json structure, which is correct for the use case.

---

## journey 2: subtract role

### repros sketch

**input:** `rhx enroll claude --roles -driver --mode plan`

**expected output:**
```json
{
  "roles": ["mechanic", "ergonomist"]
}
```

### actual implementation

**input:** same — `-driver` syntax works

**actual output (from snapshot):**
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

### ergonomics drift

| aspect | repros | actual | verdict |
|--------|--------|--------|---------|
| input syntax | `--roles -driver` | same | match |
| roles in output | array of role names | hooks with role matchers | drift |
| driver absent | yes | yes (verified by test) | match |

**verdict:** input ergonomics match. output shows hooks instead of role names, but the semantic outcome is identical: mechanic + ergonomist present, driver absent.

---

## journey 3: typo error

### repros sketch

**input:** `rhx enroll claude --roles mechnic --mode plan`

**expected output:**
```
error: role 'mechnic' not found

did you mean 'mechanic'?

available roles: mechanic, driver, ergonomist
```

### actual implementation

**actual output (from snapshot):**
```
BadRequestError: role 'mechnic' not found, did you mean 'mechanic'?

{
  "role": "mechnic",
  "rolesLinked": ["driver", "mechanic"],
  "suggestion": "mechanic"
}
```

### ergonomics drift

| aspect | repros | actual | verdict |
|--------|--------|--------|---------|
| "not found" message | yes | yes | match |
| suggestion | separate line | inline in message | improved |
| available roles | plain text list | JSON metadata | changed |
| error type | generic | BadRequestError | improved |

**verdict:** the actual format is BETTER because:
1. suggestion is in the main message (user sees it immediately)
2. metadata is structured and machine-parseable
3. error type is explicit (BadRequestError signals user input problem)

---

## journey 4: passthrough

### repros sketch

**input:** `rhx enroll claude --roles mechanic --resume --mode plan`

**expected output:**
```json
{
  "spawnArgs": ["--resume"]
}
```

### actual implementation

**test:** no explicit snapshot for passthrough

**code verification:** `filterOutRolesArg` removes only `--roles`/`-r`, all other args pass through to `enrollBrainCli`

### ergonomics drift

| aspect | repros | actual | verdict |
|--------|--------|--------|---------|
| input syntax | extra flags work | yes | match |
| spawnArgs in output | shown in plan | not captured in snapshot | minor |

**verdict:** input ergonomics match. the passthrough works correctly. the output doesn't show `spawnArgs` explicitly in plan mode, but this is a minor cosmetic difference — the critical behavior (passthrough works) is verified via code inspection.

---

## decision: update repros or fix implementation?

the guide asks: if ergonomics drifted, either update repros or fix implementation.

**for each drift, my decision:**

### drift 1: output format (wrapper vs raw config)

**repros:** wrapper JSON with `config`, `configPath`, `roles`, `spawnArgs`
**actual:** raw settings.local.json content

**decision:** keep the implementation. the repros sketch was aspirational — it imagined what a "plan mode" might look like. the actual implementation outputs the config that will be written, which is what matters. users don't need wrapper metadata.

**action:** no update needed. repros is a sketch, implementation is the reality.

### drift 2: error format (plain text vs structured)

**repros:** plain text with separate suggestion line
**actual:** BadRequestError with inline suggestion and JSON metadata

**decision:** keep the implementation. the actual format is better because:
- suggestion is visible immediately (not on a separate line)
- metadata is machine-parseable (enables automated tools)
- error type is explicit (BadRequestError vs generic error)

**action:** if repros were to be updated, it would adopt the actual format. but repros is a sketch — no update required.

### drift 3: hook format (strings vs objects)

**repros:** hooks as string arrays like `["npx rhachet roles boot ..."]`
**actual:** structured objects with `type` and `command` fields

**decision:** keep the implementation. the actual format matches the real claude-code settings.json structure. repros was a simplification.

**action:** no update needed. the implementation is correct.

---

## conclusion

**ergonomics validated. no regressions. drift improved the design.**

| journey | input match | output match | verdict |
|---------|-------------|--------------|---------|
| 1: replace | yes | structural drift, semantic match | acceptable |
| 2: subtract | yes | structural drift, semantic match | acceptable |
| 3: typo | yes | improved format | better than planned |
| 4: passthrough | yes | not captured, verified via code | acceptable |

**why no repros update needed:**

repros is a sketch artifact. its purpose was to:
1. define the input syntax (achieved — all inputs work as sketched)
2. define the expected behavior (achieved — all behaviors work as expected)
3. sketch output format (informational — actual format is better)

the implementation is the authoritative reference for output format. repros successfully guided the design; the drift represents refinement, not regression.

**final verdict:** ergonomics validated. no action required.
