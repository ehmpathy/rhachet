# self review: has-ergonomics-reviewed

## stone reviewed

3.2.distill.repros.experience._.v1

## review criteria

did I review the ergonomics of each input/output pair?

---

## input/output ergonomics review

### journey 1: replace roles

**input**: `rhx enroll claude --roles mechanic`

| dimension | assessment | notes |
|-----------|------------|-------|
| natural input | ✓ | role name is what user thinks, no transformation needed |
| convenient | ✓ | bare name = replace, no extra syntax |
| expressive | ✓ | comma-separated for multiple roles |
| composable | ✓ | works with all other claude flags via passthrough |

**output** (plan mode):
```json
{
  "config": { ... },
  "configPath": ".claude/settings.local.json",
  "roles": ["mechanic"],
  "spawnArgs": []
}
```

| dimension | assessment | notes |
|-----------|------------|-------|
| natural output | ✓ | json is parseable, roles array is clear |
| scannable | ✓ | key info (roles, configPath) at top level |
| actionable | ✓ | shows what will happen before apply |

**no friction detected.**

---

### journey 2: subtract role

**input**: `rhx enroll claude --roles -driver`

| dimension | assessment | notes |
|-----------|------------|-------|
| natural input | ✓ | `-` prefix intuitive for "remove" |
| convenient | ✓ | simpler than list all-except |
| expressive | ✓ | can combine with `+` in same spec |
| composable | ✓ | works with passthrough |

**output**: same json structure, roles excludes driver.

**no friction detected.**

---

### journey 3: typo error

**input**: `rhx enroll claude --roles mechnic`

**output**:
```
error: role 'mechnic' not found

did you mean 'mechanic'?

available roles: mechanic, driver, ergonomist
```

| dimension | assessment | notes |
|-----------|------------|-------|
| natural output | ✓ | error + suggestion + available list |
| actionable | ✓ | user knows exactly what to fix |
| scannable | ✓ | suggestion on its own line |

**no friction detected.**

---

### journey 4: passthrough

**input**: `rhx enroll claude --roles mechanic --resume`

**output** (plan mode):
```json
{
  ...
  "spawnArgs": ["--resume"]
}
```

| dimension | assessment | notes |
|-----------|------------|-------|
| natural input | ✓ | flags just work after --roles |
| convenient | ✓ | no special treatment needed by user |
| transparent | ✓ | plan output shows what passes through |

**no friction detected.**

---

## pit of success verification

| principle | status | evidence |
|-----------|--------|----------|
| intuitive design | ✓ | role names are the input, no transformation |
| convenient | ✓ | defaults work, delta syntax for tweaks |
| expressive | ✓ | replace, append, subtract all supported |
| composable | ✓ | passthrough enables all brain flags |
| lower trust contracts | ✓ | validate role names at parse time |
| deeper behavior | ✓ | typo suggestions, idempotent ops |

---

## friction points found

none.

the design follows natural user mental model:
1. user thinks "i want mechanic" → types `--roles mechanic`
2. user thinks "i want less driver noise" → types `--roles -driver`
3. user makes typo → gets suggestion immediately
4. user wants extra flag → just adds it

---

## verdict

✓ all input/output pairs reviewed
✓ no awkward inputs found
✓ no awkward outputs found
✓ pit of success principles satisfied

no changes needed.
