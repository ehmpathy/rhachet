# self-review r7: role-standards-coverage

an eighth review for coverage of mechanic role standards.

---

## step 1: what standards apply?

the mechanic role has these practice categories:

| category | path | applicable? |
|----------|------|-------------|
| lang.terms | briefs/practices/lang.terms/ | yes |
| lang.tones | briefs/practices/lang.tones/ | yes |
| code.prod | briefs/practices/code.prod/ | limited |
| code.test | briefs/practices/code.test/ | no |
| work.flow | briefs/practices/work.flow/ | no |

---

## step 2: lang.terms coverage

| standard | covered in r7? | evidence |
|----------|----------------|----------|
| rule.forbid.gerunds | yes | step 3.1 checked all text |
| rule.require.ubiqlang | yes | step 3.2 checked all terms |
| rule.require.order.noun_adj | n/a | no compound names |
| rule.require.treestruct | n/a | config file, not procedure |
| forbidden term checks | yes | step 3.3 checked for forbidden terms |

all applicable lang.terms standards were checked.

---

## step 3: lang.tones coverage

| standard | covered in r7? | evidence |
|----------|----------------|----------|
| rule.prefer.lowercase | yes | step 4.1 checked all comments |
| rule.forbid.buzzwords | yes | step 4.2 checked all text |
| rule.forbid.shouts | yes | step 4.3 checked for ALL CAPS |

all applicable lang.tones standards were checked.

---

## step 4: code.prod coverage

| standard | applicable? | covered? | evidence |
|----------|-------------|----------|----------|
| evolvable.architecture | no | n/a | config file |
| evolvable.procedures | no | n/a | config file |
| pitofsuccess | no | n/a | config file |
| readable.comments | partial | yes | step 5.4 noted header comments |

the config file is not code. most code.prod standards do not apply.

---

## step 5: yaml conventions coverage

| check | covered in r7? | evidence |
|-------|----------------|----------|
| valid syntax | yes | step 7 |
| 2-space indent | yes | step 7 |
| comment format | yes | step 7 |
| no tabs | yes | step 7 |
| final newline | yes | step 7 |

all yaml conventions were checked.

---

## step 6: anti-pattern coverage

| anti-pattern | covered in r7? | evidence |
|--------------|----------------|----------|
| magic strings | yes | step 6 |
| unclear abbreviations | yes | step 6 |
| inconsistent style | yes | step 6 |
| duplicate content | yes | step 6 |
| overly complex structure | yes | step 6 |

all anti-patterns were checked.

---

## step 7: what was not covered?

standards not applicable to this change:

| category | reason not applicable |
|----------|----------------------|
| code.test | no tests added |
| work.flow | no git/release changes |
| code.prod (most) | config file, not typescript |

these omissions are correct — the standards do not apply to yaml config files.

---

## summary

| standard category | applicable? | covered? |
|-------------------|-------------|----------|
| lang.terms | yes | yes |
| lang.tones | yes | yes |
| code.prod | partial | yes |
| yaml conventions | yes | yes |
| anti-patterns | yes | yes |

**verdict:** all applicable mechanic role standards were covered in the adherance review. no standard was skipped that should have been checked.

---

## why this holds

### the fundamental question

the guide asks: "did the review cover all applicable standards?"

to answer this:
1. enumerate all standard categories
2. determine which apply to this change
3. verify each applicable standard was checked

### which standards apply

this change adds a yaml config file. applicable standards:
- term rules (apply to all text)
- tone rules (apply to all comments)
- yaml conventions (apply to yaml files)

inapplicable standards:
- test rules (no tests added)
- workflow rules (no git/release changes)
- code.prod rules (config, not typescript)

### verification

the adherance review (r7) checked:
- gerunds: line-by-line analysis, none found
- ubiqlang: term-by-term analysis, all canonical
- forbidden terms: explicit check, none found
- lowercase: comment-by-comment, all lowercase
- buzzwords: text-by-text, none found
- shouts: file-wide check, none found
- yaml conventions: syntax, indent, format all checked
- anti-patterns: all five checked

every applicable standard has a corresponding check in the adherance review.

### conclusion

coverage is complete because:
1. all applicable standards were identified
2. each applicable standard was checked in the adherance review
3. inapplicable standards were correctly omitted with documented reasons

