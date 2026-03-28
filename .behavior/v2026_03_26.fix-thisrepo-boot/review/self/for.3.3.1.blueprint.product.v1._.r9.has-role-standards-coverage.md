# self-review r9: has-role-standards-coverage

reviewed the blueprint for coverage of all applicable mechanic role standards.

---

## step 1: enumerate all standard categories

mechanic role standards are organized under:

```
.agent/repo=ehmpathy/role=mechanic/briefs/practices/
├── lang.terms/           # name conventions
├── lang.tones/           # tone and style
├── code.prod/            # production code standards
├── code.test/            # test code standards
└── work.flow/            # workflow practices
```

---

## step 2: which categories apply to boot.yml?

the blueprint proposes:
- 1 config file (boot.yml)
- 0 code changes
- 0 test changes

| category | applies? | reason |
|----------|----------|--------|
| lang.terms | yes | file has comments, yaml keys, paths |
| lang.tones | yes | file has prose in comments |
| code.prod | no | no production code |
| code.test | no | no test code |
| work.flow | no | no workflow changes |

only lang.terms and lang.tones apply to this pure config change.

---

## step 3: lang.terms standards coverage

### rule.forbid.gerunds

| location | text | gerund? |
|----------|------|---------|
| line 3 | "controls which briefs are said" | no — "said" is past participle |
| line 4 | "unmatched briefs become refs" | no — no -ing words |
| line 8 | "core identity - always boot these" | no |
| line 11 | "actively used patterns" | no — "used" is past participle |
| line 15 | "test patterns (frequently referenced)" | no — "referenced" is past participle |

**covered:** zero gerunds in boot.yml.

### rule.prefer.lowercase

| location | text | lowercase? |
|----------|------|------------|
| line 1 | `# .agent/repo=.this/role=any/boot.yml` | yes |
| line 3 | `# controls which briefs...` | yes — starts lowercase |
| line 4 | `# unmatched briefs...` | yes — starts lowercase |
| line 6 | `briefs:` | yes |
| line 7 | `say:` | yes |
| all paths | `briefs/define.rhachet.v3.md` etc | yes |

**covered:** all text is lowercase.

### rule.forbid.buzzwords

| location | text | buzzword? |
|----------|------|-----------|
| line 3 | "controls", "briefs", "inline", "pointer" | no — all precise |
| line 4 | "unmatched", "refs", "automatically" | no — all precise |
| line 8 | "core identity" | no — domain term |
| line 11 | "actively used patterns" | no — descriptive |
| line 15 | "test patterns", "frequently referenced" | no — descriptive |

**covered:** zero buzzwords.

### rule.require.ubiqlang

| term | canonical? | consistent? |
|------|------------|-------------|
| briefs | yes | matches codebase |
| say | yes | matches boot.yml schema |
| ref | yes | matches boot.yml schema |
| patterns | yes | matches brief names |

**covered:** all terms are canonical.

### rule.require.treestruct

not applicable — boot.yml is config, not code.

### rule.require.order.noun_adj

not applicable — boot.yml has no variable or function names.

---

## step 4: lang.tones standards coverage

### rule.prefer.lowercase

already checked above. **covered.**

### rule.prefer.chill-nature-emojis

not applicable — boot.yml is config file, not human-visible output. emojis are for logs and cli output.

### rule.require.term-human

not applicable — boot.yml does not reference persons.

### rule.forbid.shouts

| location | text | shouts? |
|----------|------|---------|
| all lines | checked | no all-caps acronyms |

**covered:** zero shouts.

---

## step 5: verify no omitted practices

practices that might seem applicable but are not:

| practice | why not applicable |
|----------|-------------------|
| error logic | no code |
| validation | no code |
| tests | no code |
| types | no code |
| narrative flow | no code |
| dependency injection | no code |
| idempotency | no code |

the blueprint correctly identifies this as a pure config change.

---

## step 6: verify no practices are absent

all applicable practices from lang.terms and lang.tones have been checked:

| practice | status |
|----------|--------|
| rule.forbid.gerunds | covered |
| rule.prefer.lowercase | covered |
| rule.forbid.buzzwords | covered |
| rule.require.ubiqlang | covered |
| rule.forbid.shouts | covered |

no practices are absent from the review.

---

## summary

| standard category | practices checked | status |
|-------------------|-------------------|--------|
| lang.terms | 4 | all covered |
| lang.tones | 2 | all covered |
| code.prod | 0 | n/a |
| code.test | 0 | n/a |
| work.flow | 0 | n/a |

**verdict:** full coverage of all applicable mechanic role standards. no standards were skipped or overlooked.
