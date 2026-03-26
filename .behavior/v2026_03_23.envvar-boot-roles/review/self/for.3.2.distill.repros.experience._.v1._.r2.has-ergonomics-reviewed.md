# self review (r2): has-ergonomics-reviewed

## stone reviewed

3.2.distill.repros.experience._.v1

## what I found this time

re-reviewed with fresh eyes. questioned each input/output pair.

---

## issue found: plan mode output could be clearer

### the issue

the plan mode json output is functional but not immediately scannable by humans:

```json
{
  "config": { ... },
  "configPath": ".claude/settings.local.json",
  "roles": ["mechanic"],
  "spawnArgs": []
}
```

### why it holds (not an issue after reflection)

actually, this is fine because:
1. plan mode is primarily for tests (machine consumption)
2. for human verification, a summary line before the json would help
3. but that's an enhancement, not a blocker

**decision**: keep as is. enhancement can come later if users request.

---

## issue found: error message format

### the issue

the typo error output:
```
error: role 'mechnic' not found

did you mean 'mechanic'?

available roles: mechanic, driver, ergonomist
```

### why it holds (not an issue after reflection)

this follows the pattern:
1. what went wrong (error line)
2. how to fix (suggestion)
3. available options (list)

this is the pit-of-success pattern for error messages. no change needed.

---

## non-issue: comma-separated syntax

### questioned

is `--roles mechanic,driver` natural? or should it be `--roles mechanic --roles driver`?

### why it holds

1. comma-separated is more compact: `--roles a,b,c` vs `--roles a --roles b --roles c`
2. env var equivalent uses comma: `RHACHET_ROLES=a,b,c`
3. other tools use comma (docker, kubectl)
4. multiple `--roles` flags could be supported later as sugar

**decision**: comma-separated is the right choice. no change needed.

---

## non-issue: +/- prefix disambiguation

### questioned

could `--roles -driver` be confused with a flag?

### why it holds

1. commander arg parse handles this via `allowUnknownOption`
2. `-d` would be ambiguous, but `-driver` is clearly a role name
3. if ambiguity arises, `--roles=-driver` works
4. no other flags start with role names

**decision**: the design handles this edge case. no change needed.

---

## non-issue: passthrough arg order

### questioned

does `rhx enroll claude --roles mechanic --resume` work the same as `rhx enroll claude --resume --roles mechanic`?

### why it holds

1. commander parses known flags regardless of order
2. `--roles` is consumed by wrapper
3. rest of the args pass to brain
4. order shouldn't matter for either wrapper or brain

**decision**: order independence is correct. test should verify this.

---

## issues to add to test coverage

found via review:
1. **test order independence**: `--roles x --resume` vs `--resume --roles x`
2. **test explicit equals syntax**: `--roles=-driver` for disambiguation

these aren't design changes, but test coverage gaps.

---

## verdict

✓ re-reviewed each input/output pair
✓ questioned assumptions about syntax choices
✓ found no design issues that require change
✓ found two test coverage gaps to add

design holds. test coverage to expand.
