# self-review r9: has-role-standards-adherence

deeper review with line-by-line check of actual boot.yml against mechanic standards.

---

## actual boot.yml content (17 lines)

```yaml
1:  # .agent/repo=.this/role=any/boot.yml
2:  #
3:  # controls which briefs are said (inline) vs reffed (pointer only).
4:  # unmatched briefs become refs automatically.
5:
6:  briefs:
7:    say:
8:      # core identity - always boot these
9:      - briefs/define.rhachet.v3.md
10:     - briefs/define.agent-dir.md
11:     # actively used patterns
12:     - briefs/howto.test-local-rhachet.md
13:     - briefs/bin.dispatcher.pattern.md
14:     - briefs/run.executable.lookup.pattern.md
15:     # test patterns (frequently referenced)
16:     - briefs/code.test.accept.blackbox.md
17:     - briefs/rule.require.shared-test-fixtures.md
```

---

## line-by-line standard check

### line 1: `# .agent/repo=.this/role=any/boot.yml`

| standard | check | result |
|----------|-------|--------|
| lowercase | yes | all lowercase |
| gerunds | n/a | no verbs |
| buzzwords | n/a | path only |

**holds:** file path comment follows conventions.

### line 2: `#`

blank comment line for visual separation. no standards apply.

### line 3: `# controls which briefs are said (inline) vs reffed (pointer only).`

| standard | check | result |
|----------|-------|--------|
| lowercase | yes | starts lowercase |
| gerunds | no | "said", "reffed" are past participles |
| buzzwords | no | "controls", "briefs", "inline", "pointer" are precise |

**holds:** describes behavior clearly.

### line 4: `# unmatched briefs become refs automatically.`

| standard | check | result |
|----------|-------|--------|
| lowercase | yes | starts lowercase |
| gerunds | no | none |
| buzzwords | no | all precise terms |

**holds:** explains default behavior.

### line 5: (blank)

visual separation. no standards apply.

### line 6: `briefs:`

| standard | check | result |
|----------|-------|--------|
| lowercase | yes | "briefs" lowercase |
| name convention | yes | noun key |

**holds:** follows yaml schema.

### line 7: `  say:`

| standard | check | result |
|----------|-------|--------|
| lowercase | yes | "say" lowercase |
| name convention | yes | verb key (imperative) |

**holds:** follows yaml schema.

### line 8: `    # core identity - always boot these`

| standard | check | result |
|----------|-------|--------|
| lowercase | yes | starts lowercase |
| gerunds | no | none |
| buzzwords | no | "core identity" is domain term |

**holds:** groups related briefs.

### line 9: `    - briefs/define.rhachet.v3.md`

| standard | check | result |
|----------|-------|--------|
| lowercase | yes | all lowercase |
| brief prefix | yes | `define.` |
| path format | yes | `briefs/` prefix |

**holds:** follows brief path conventions.

### line 10: `    - briefs/define.agent-dir.md`

| standard | check | result |
|----------|-------|--------|
| lowercase | yes | all lowercase |
| brief prefix | yes | `define.` |
| path format | yes | `briefs/` prefix |

**holds:** follows brief path conventions.

### line 11: `    # actively used patterns`

| standard | check | result |
|----------|-------|--------|
| lowercase | yes | starts lowercase |
| gerunds | no | "used" is past participle |
| buzzwords | no | "actively" modifies "used" precisely |

**holds:** groups related briefs.

### line 12: `    - briefs/howto.test-local-rhachet.md`

| standard | check | result |
|----------|-------|--------|
| lowercase | yes | all lowercase |
| brief prefix | yes | `howto.` |
| path format | yes | `briefs/` prefix |

**holds:** follows brief path conventions.

### line 13: `    - briefs/bin.dispatcher.pattern.md`

| standard | check | result |
|----------|-------|--------|
| lowercase | yes | all lowercase |
| brief suffix | yes | `.pattern.md` |
| path format | yes | `briefs/` prefix |

**holds:** follows brief path conventions.

### line 14: `    - briefs/run.executable.lookup.pattern.md`

| standard | check | result |
|----------|-------|--------|
| lowercase | yes | all lowercase |
| brief suffix | yes | `.pattern.md` |
| path format | yes | `briefs/` prefix |

**holds:** follows brief path conventions.

### line 15: `    # test patterns (frequently referenced)`

| standard | check | result |
|----------|-------|--------|
| lowercase | yes | starts lowercase |
| gerunds | no | "referenced" is past participle |
| buzzwords | no | "frequently" is precise adverb |

**holds:** groups related briefs.

### line 16: `    - briefs/code.test.accept.blackbox.md`

| standard | check | result |
|----------|-------|--------|
| lowercase | yes | all lowercase |
| brief prefix | yes | `code.` |
| path format | yes | `briefs/` prefix |

**holds:** follows brief path conventions.

### line 17: `    - briefs/rule.require.shared-test-fixtures.md`

| standard | check | result |
|----------|-------|--------|
| lowercase | yes | all lowercase |
| brief prefix | yes | `rule.` |
| path format | yes | `briefs/` prefix |

**holds:** follows brief path conventions.

---

## summary by line

| line | content type | standards checked | result |
|------|--------------|-------------------|--------|
| 1 | path comment | lowercase | holds |
| 2 | blank comment | n/a | holds |
| 3 | description | lowercase, gerunds, buzzwords | holds |
| 4 | description | lowercase, gerunds, buzzwords | holds |
| 5 | blank | n/a | holds |
| 6 | yaml key | lowercase, name convention | holds |
| 7 | yaml key | lowercase, name convention | holds |
| 8 | group comment | lowercase, gerunds, buzzwords | holds |
| 9 | glob path | lowercase, brief convention | holds |
| 10 | glob path | lowercase, brief convention | holds |
| 11 | group comment | lowercase, gerunds, buzzwords | holds |
| 12 | glob path | lowercase, brief convention | holds |
| 13 | glob path | lowercase, brief convention | holds |
| 14 | glob path | lowercase, brief convention | holds |
| 15 | group comment | lowercase, gerunds, buzzwords | holds |
| 16 | glob path | lowercase, brief convention | holds |
| 17 | glob path | lowercase, brief convention | holds |

**all 17 lines:** holds

---

## anti-pattern check

| anti-pattern | present? | evidence |
|--------------|----------|----------|
| YAGNI | no | minimal file, 7 paths only |
| premature abstraction | no | exact paths, no glob wildcards |
| backwards compat | no | no code, no shims |
| over-documentation | no | 4 comment lines |
| magic values | no | all paths explicit |
| term overload | no | "say" has clear semantics |

---

## final verification

re-read the file one more time with fresh eyes:

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

**observations:**
- clean structure
- clear intent
- minimal documentation
- no violations

**verdict:** all mechanic role standards are satisfied. zero violations found. the boot.yml is clean, minimal, and follows all conventions.
