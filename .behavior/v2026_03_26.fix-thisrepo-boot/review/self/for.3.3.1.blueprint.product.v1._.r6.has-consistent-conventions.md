# self-review r6: has-consistent-conventions

deeper review of name conventions after first review was marked insufficient.

---

## focus: what was missed in r5?

r5 covered structural conventions but may have missed:
1. name conventions for the globs themselves
2. whether the brief file names follow conventions
3. whether inline comments match extant style
4. cross-referential consistency

let me examine each.

---

## check 1: glob pattern conventions

### extant glob patterns in codebase

from `parseRoleBootYaml.test.ts`:
```
practices/**/*.md
glossary.md
archive/**/*.md
git.commit/**/*.sh
core.md
archive.md
```

from `blackbox/.test/assets/with-boot-yaml-simple/boot.yml`:
```
briefs/always-say.md
briefs/subdir/**/*.md
skills/say-me.sh
```

### our glob patterns

```
briefs/define.rhachet.v3.md
briefs/define.agent-dir.md
briefs/howto.test-local-rhachet.md
briefs/bin.dispatcher.pattern.md
briefs/run.executable.lookup.pattern.md
briefs/code.test.accept.blackbox.md
briefs/rule.require.shared-test-fixtures.md
```

### comparison

| pattern type | extant examples | ours |
|--------------|-----------------|------|
| exact file match | `glossary.md`, `core.md` | `briefs/define.rhachet.v3.md` |
| with prefix | `briefs/always-say.md` | `briefs/define.rhachet.v3.md` |
| wildcards | `**/*.md` | none (all exact paths) |

**observation:** we use exact paths, not wildcards. is this a convention violation?

**analysis:** no. the test examples show both patterns are valid:
- exact: `glossary.md`, `briefs/always-say.md`
- wildcard: `**/*.md`, `briefs/subdir/**/*.md`

we chose exact paths for precision. this is a valid choice, not a convention violation.

**verdict:** consistent — exact paths are valid per extant examples.

---

## check 2: brief file name conventions

### extant brief names in this role

```
.agent/repo=.this/role=any/briefs/
├── define.rhachet.v3.md
├── define.agent-dir.md
├── howto.test-local-rhachet.md
├── bin.dispatcher.pattern.md
├── run.executable.lookup.pattern.md
├── code.test.accept.blackbox.md
├── rule.require.shared-test-fixtures.md
├── cli.repo.introspect.md
├── rule.forbid.rhachet-use-ts.md
├── rule.require.fixture-gitignore-negation.md
├── postlabor.soph000.summary.[article].md
├── domain.thought/
└── infra.composition/
```

### name patterns observed

| prefix | what it denotes | examples |
|--------|-----------------|----------|
| `define.` | definition/concept brief | `define.rhachet.v3.md`, `define.agent-dir.md` |
| `howto.` | procedural guide | `howto.test-local-rhachet.md` |
| `rule.` | code rule | `rule.require.shared-test-fixtures.md` |
| `code.` | code practice | `code.test.accept.blackbox.md` |
| `*.pattern.md` | pattern brief | `bin.dispatcher.pattern.md` |

### do our say globs reference valid briefs?

| glob | file exists? | name follows convention? |
|------|--------------|--------------------------|
| `briefs/define.rhachet.v3.md` | yes | yes — `define.` prefix |
| `briefs/define.agent-dir.md` | yes | yes — `define.` prefix |
| `briefs/howto.test-local-rhachet.md` | yes | yes — `howto.` prefix |
| `briefs/bin.dispatcher.pattern.md` | yes | yes — `.pattern.md` suffix |
| `briefs/run.executable.lookup.pattern.md` | yes | yes — `.pattern.md` suffix |
| `briefs/code.test.accept.blackbox.md` | yes | yes — `code.` prefix |
| `briefs/rule.require.shared-test-fixtures.md` | yes | yes — `rule.` prefix |

**verdict:** all referenced briefs exist and follow extant name conventions.

---

## check 3: yaml comment style

### extant yaml comments in codebase

searched for yaml files with comments:

```bash
grep -r "^#" --include="*.yml" --include="*.yaml" .
```

found: `.github/workflows/*.yml` files use header comments

```yaml
# .github/workflows/test.yml
name: test
```

### our yaml comments

```yaml
# .agent/repo=.this/role=any/boot.yml
#
# controls which briefs are said (inline) vs reffed (pointer only).
# unmatched briefs become refs automatically.
```

### comparison

| style element | workflow style | our style |
|---------------|----------------|-----------|
| header comment | single line | multi-line |
| blank lines after header | no | yes |
| comment content | file path | file path + description |

**is this consistent?** the workflow files are a different context (ci config vs role config). there is no extant boot.yml with comments to compare against.

**verdict:** no violation — we establish convention for boot.yml comments. this is reasonable for a new file type in this role.

---

## check 4: inline comments in yaml

### extant inline comments

searched the codebase for inline yaml comments (`#` after content on same line):

```bash
grep -r " #" --include="*.yml" --include="*.yaml" .
```

found: none in boot.yml files (no prior boot.yml with inline comments)

### our inline comments

```yaml
    # core identity - always boot these
    - briefs/define.rhachet.v3.md
```

this places the comment on its own line before the item. this is standard yaml practice — a comment line above the related content.

**verdict:** consistent — above-item comments are standard yaml.

---

## check 5: cross-reference to vision and blueprint

### vision doc proposed

from `1.vision.md`:
```yaml
briefs:
  say:
    - define.rhachet.v3.md
    - define.agent-dir.md
```

note: the vision used paths without `briefs/` prefix, but earlier research showed globs need the prefix to match. the blueprint corrected this.

### blueprint proposed

from `3.3.1.blueprint.product.v1.i1.md`:
```yaml
briefs:
  say:
    - briefs/define.rhachet.v3.md
    - briefs/define.agent-dir.md
    ...
```

### actual boot.yml

matches the blueprint exactly (with additional briefs per user request).

**verdict:** consistent with blueprint and corrected vision.

---

## summary: all conventions checked

| convention category | status | notes |
|--------------------|--------|-------|
| glob pattern format | consistent | exact paths valid per test examples |
| brief name conventions | consistent | all use extant prefix/suffix patterns |
| yaml structure | consistent | matches schema |
| yaml comments | establishes new | no prior boot.yml to compare |
| inline comments | standard yaml | above-item comment style |
| cross-reference | consistent | matches blueprint |

**final verdict:** all name and structural conventions are consistent with extant patterns. where no prior boot.yml examples exist, we establish reasonable conventions that align with yaml best practices.
