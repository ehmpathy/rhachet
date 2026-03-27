# self-review r4: has-consistent-conventions

a fourth review for divergence from extant names and patterns.

---

## step 1: re-read the artifacts

opened and examined:
- `.agent/repo=.this/role=any/boot.yml` — the execution artifact
- `.agent/repo=ehmpathy/role=mechanic/boot.yml` — extant reference

---

## step 2: extant boot.yml structure

from mechanic boot.yml:

```yaml
# .agent/repo=ehmpathy/role=mechanic/boot.yml
#
# controls which briefs and skills are booted as say vs ref.
# unmatched briefs/skills become refs automatically.

briefs:
  say:
    - briefs/practices/**/*
```

this establishes the convention:
1. path comment on line 1
2. blank comment on line 2
3. explanation on lines 3-4
4. blank line
5. `briefs:` key
6. `say:` nested key
7. list items under `say:`

---

## step 3: our boot.yml structure

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
    # actively used patterns
    - briefs/howto.test-local-rhachet.md
    - briefs/bin.dispatcher.pattern.md
    - briefs/run.executable.lookup.pattern.md
    # test patterns (frequently referenced)
    - briefs/code.test.accept.blackbox.md
    - briefs/rule.require.shared-test-fixtures.md
```

---

## step 4: name convention check

### 4.1 file name

| convention | extant | ours | match? |
|------------|--------|------|--------|
| file name | `boot.yml` | `boot.yml` | yes |

### 4.2 top-level keys

| convention | extant | ours | match? |
|------------|--------|------|--------|
| briefs key | `briefs:` | `briefs:` | yes |
| skills key | `skills:` | absent | n/a |

skills key absent because the wish does not request skill curation.

### 4.3 nested keys

| convention | extant | ours | match? |
|------------|--------|------|--------|
| say key | `say:` | `say:` | yes |
| ref key | absent | absent | yes |

---

## step 5: path format convention check

extant:
```yaml
- briefs/practices/**/*
```

ours:
```yaml
- briefs/define.rhachet.v3.md
```

both use:
- `briefs/` prefix
- relative path from role directory

**holds:** path format matches convention.

---

## step 6: comment convention check

### 6.1 header comments

| extant | ours |
|--------|------|
| `# .agent/repo=ehmpathy/role=mechanic/boot.yml` | `# .agent/repo=.this/role=any/boot.yml` |

same format: `# .agent/repo=$repo/role=$role/boot.yml`

### 6.2 explanation comments

| extant | ours |
|--------|------|
| `# controls which briefs and skills are booted as say vs ref.` | `# controls which briefs are said (inline) vs reffed (pointer only).` |

same purpose, different words. both explain the file's function.

### 6.3 section comments

extant has none (single glob). ours has:
```yaml
# core identity - always boot these
# actively used patterns
# test patterns (frequently referenced)
```

this is an addition for readability, not a divergence. section comments are standard yaml practice.

---

## step 7: term consistency check

| term | extant usage | our usage | consistent? |
|------|--------------|-----------|-------------|
| briefs | `briefs:` | `briefs:` | yes |
| say | `say:` | `say:` | yes |
| ref | mentioned in comments | mentioned in comments | yes |

no new terms introduced.

---

## step 8: file location convention

| role | location |
|------|----------|
| mechanic | `.agent/repo=ehmpathy/role=mechanic/boot.yml` |
| ours | `.agent/repo=.this/role=any/boot.yml` |

pattern: `.agent/repo=$repo/role=$role/boot.yml`

**holds:** location follows convention.

---

## summary

| check | result |
|-------|--------|
| file name | matches (`boot.yml`) |
| top-level keys | matches (`briefs:`) |
| nested keys | matches (`say:`) |
| path format | matches (`briefs/` prefix) |
| header comment | matches (path comment) |
| explanation comment | matches (describes function) |
| section comments | consistent (yaml standard) |
| terms | matches (briefs, say, ref) |
| file location | matches (`.agent/repo=$repo/role=$role/`) |

**verdict:** zero divergence from extant conventions. every name and pattern follows established precedent.

---

## why this holds

the boot.yml is pure data that follows the schema and conventions established by other boot.yml files in the codebase. no new names introduced. no structural divergence. the file would be indistinguishable from other boot.yml files if you removed the path-specific content.
