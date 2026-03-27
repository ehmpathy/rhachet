# self-review r5: has-consistent-conventions

reviewed the blueprint for divergence from extant name conventions and patterns.

---

## step 1: identify extant boot.yml conventions

searched for extant boot.yml files in the codebase.

### found: test fixture

`blackbox/.test/assets/with-boot-yaml-simple/.agent/repo=.this/role=any/boot.yml`:

```yaml
briefs:
  say:
    - briefs/always-say.md
    - briefs/subdir/**/*.md
skills:
  say:
    - skills/say-me.sh
```

### found: unit test examples

`src/domain.operations/boot/parseRoleBootYaml.test.ts`:

```yaml
briefs:
  say:
    - practices/**/*.md
    - glossary.md
```

---

## step 2: identify conventions

| convention | extant pattern |
|------------|----------------|
| yaml structure | `briefs:` then `say:` then `- glob` |
| glob prefix | `briefs/` for briefs, `skills/` for skills |
| indentation | 2 spaces |
| header comments | none in fixture |
| inline comments | none in fixture |

---

## step 3: compare proposed boot.yml

our boot.yml:

```yaml
# .agent/repo=.this/role=any/boot.yml
#
# controls which briefs are said (inline) vs reffed (pointer only).
# unmatched briefs become refs automatically.

briefs:
  say:
    # core identity - always boot these
    - briefs/define.rhachet.v3.md
    - briefs/define.agent-dir.md
```

### convention comparison

| convention | extant | ours | match? |
|------------|--------|------|--------|
| yaml structure | `briefs:` → `say:` → `- glob` | same | yes |
| glob prefix | `briefs/` | `briefs/` | yes |
| indentation | 2 spaces | 2 spaces | yes |
| header comments | none | added | no |
| inline comments | none | added | no |

---

## step 4: evaluate deviations

### deviation 1: header comment

**extant:** no header comment in fixture
**ours:** 4-line header comment

**is this a problem?** no. the fixture is minimal for test purposes. a real config file benefits from documentation. yaml supports comments — they are a feature, not a violation.

**verdict:** acceptable deviation — improves usability.

### deviation 2: inline comments

**extant:** no inline comments in fixture
**ours:** inline comments group related briefs

**is this a problem?** no. same rationale. the fixture is minimal. production configs benefit from organization.

**verdict:** acceptable deviation — improves readability.

---

## step 5: check name conventions

| name element | convention check |
|--------------|------------------|
| file name | `boot.yml` — matches schema and test expectations |
| key `briefs` | matches schema RoleBootSpecSimplified |
| key `say` | matches schema RoleBootSpecSimplified |
| glob paths | `briefs/*.md` — matches filterByGlob expectations |

all names match extant conventions.

---

## step 6: check structural patterns

| pattern | extant | ours | match? |
|---------|--------|------|--------|
| yaml root object | `briefs:` and `skills:` optional | `briefs:` only | yes |
| say/ref arrays | arrays of globs | array of globs | yes |
| glob format | relative paths | relative paths | yes |

all structural patterns match.

---

## step 7: verify test expectations

the acceptance test expects:
- `<brief.say path=".agent/repo=.this/role=any/briefs/always-say.md">`
- say briefs have full content
- ref briefs have path only

our boot.yml would produce the same pattern:
- say briefs matched by globs → inline
- unmatched briefs → refs

consistent with test expectations.

---

## summary

| item | status | notes |
|------|--------|-------|
| yaml structure | consistent | matches schema |
| glob prefix | consistent | uses `briefs/` |
| indentation | consistent | 2 spaces |
| name conventions | consistent | matches schema keys |
| header comments | deviation | acceptable — improves docs |
| inline comments | deviation | acceptable — improves readability |

**verdict:** consistent conventions. the deviations (comments) are intentional improvements, not violations.

the boot.yml follows all structural and name conventions. comments are optional yaml features used to improve documentation.
