# self-review r7: role-standards-adherance

a seventh review for adherance to mechanic role standards.

---

## step 1: enumerate rule directories

the mechanic role has these briefs subdirectories:

```
.agent/repo=ehmpathy/role=mechanic/briefs/practices/
├── lang.terms/      # term consistency rules
├── lang.tones/      # tone and style rules
├── code.prod/       # production code rules
├── code.test/       # test code rules
└── work.flow/       # workflow rules
```

### which are relevant?

| directory | relevant? | why |
|-----------|-----------|-----|
| lang.terms | yes | boot.yml has comments with terms |
| lang.tones | yes | boot.yml has comments with tone |
| code.prod | partially | config, not code, but some apply |
| code.test | no | no tests added |
| work.flow | no | no git/release changes |

---

## step 2: the file to review

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

## step 3: check lang.terms rules

### 3.1 rule.forbid.gerunds

gerunds are -ing words used as nouns.

| line | text | analysis |
|------|------|----------|
| 1 | `# .agent/repo=.this/role=any/boot.yml` | no words with -ing |
| 3 | `# controls which briefs are said (inline) vs reffed (pointer only).` | no gerunds — "said" and "reffed" are past participles |
| 4 | `# unmatched briefs become refs automatically.` | no gerunds — "unmatched" is adjective |
| 8 | `# core identity - always boot these` | no words with -ing |
| 11 | `# actively used patterns` | no gerunds — "actively" is adverb, "used" is past participle |
| 15 | `# test patterns (frequently referenced)` | no gerunds — "referenced" is past participle |

**verdict:** no gerunds found.

### 3.2 rule.require.ubiqlang

| term | canonical? | evidence |
|------|------------|----------|
| briefs | yes | standard rhachet term |
| said | yes | matches "say" vocabulary |
| reffed | yes | matches "ref" vocabulary |
| inline | yes | technical term for "in context" |
| pointer | yes | technical term for "reference" |
| identity | yes | describes core role definition |
| patterns | yes | describes reusable practices |

**verdict:** all terms are canonical.

### 3.3 forbidden term checks

file contains no instance of forbidden terms:
- no "helper" or derivative
- no overloaded procedure-like terms

---

## step 4: check lang.tones rules

### 4.1 rule.prefer.lowercase

| line | starts with capital? |
|------|---------------------|
| 1 | no — `# .agent/...` |
| 3 | no — `# controls...` |
| 4 | no — `# unmatched...` |
| 8 | no — `# core...` |
| 11 | no — `# actively...` |
| 15 | no — `# test...` |

**verdict:** all comments are lowercase.

### 4.2 rule.forbid.buzzwords

| text | buzzword check |
|------|----------------|
| "controls which briefs" | no buzzword — specific action |
| "core identity" | not a buzzword — specific concept in rhachet |
| "actively used" | not a buzzword — describes frequency |
| "frequently referenced" | not a buzzword — describes access pattern |

**verdict:** no buzzwords.

### 4.3 rule.forbid.shouts

no ALL CAPS text anywhere in the file.

**verdict:** no shouts.

---

## step 5: check code.prod rules (applicable subset)

### 5.1 evolvable.architecture rules

not applicable — this is a config file, not code architecture.

### 5.2 evolvable.procedures rules

not applicable — this is a config file, not a procedure.

### 5.3 pitofsuccess rules

not applicable — this is a config file, not error-prone code.

### 5.4 readable.comments rules

boot.yml has header comments. do they follow readable.comments?

| rule | applicable? | check |
|------|-------------|-------|
| what-why-headers | no — config, not procedure | n/a |

the comments explain purpose (what the file does), which aligns with documentation spirit.

---

## step 6: check for anti-patterns

| anti-pattern | check | result |
|--------------|-------|--------|
| magic strings | paths are explicit, not magic | pass |
| unclear abbreviations | all terms spelled out | pass |
| inconsistent style | matches other boot.yml files | pass |
| duplicate content | no duplication | pass |
| overly complex structure | simple yaml, 17 lines | pass |

---

## step 7: yaml-specific checks

| check | result |
|-------|--------|
| valid yaml syntax | yes |
| 2-space indentation | yes |
| comments with `# ` | yes |
| no tabs | yes (spaces only) |
| final newline | yes |

---

## summary

| standard | violations | evidence |
|----------|------------|----------|
| rule.forbid.gerunds | 0 | step 3.1 |
| rule.require.ubiqlang | 0 | step 3.2 |
| forbidden terms | 0 | step 3.3 |
| rule.prefer.lowercase | 0 | step 4.1 |
| rule.forbid.buzzwords | 0 | step 4.2 |
| rule.forbid.shouts | 0 | step 4.3 |
| yaml conventions | 0 | step 7 |
| anti-patterns | 0 | step 6 |

**verdict:** the boot.yml adheres to all applicable mechanic role standards.

---

## why this holds

### the file is config, not code

most mechanic standards apply to typescript code. boot.yml is a yaml config file. the applicable standards are:

1. **term rules** — apply to all text
2. **tone rules** — apply to all comments
3. **yaml conventions** — apply to yaml files

### each applicable rule was checked

for each rule that applies:
- enumerated all text fragments
- checked each fragment against the rule
- documented the result

### no violations found

zero instances of:
- gerunds
- forbidden terms
- buzzwords
- shouts
- incorrect case
- yaml syntax errors

the file is minimal, follows conventions, and uses canonical vocabulary.
