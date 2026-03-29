# self-review r8: role-standards-coverage

review for coverage of mechanic role standards.

---

## step 1: enumerate rule directories

the mechanic role has these briefs subdirectories:

```
.agent/repo=ehmpathy/role=mechanic/briefs/practices/
├── lang.terms/      # term rules
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
| code.prod | partial | config, not code, but some apply |
| code.test | no | no tests added |
| work.flow | no | no git/release changes |

---

## step 2: lang.terms directory coverage

### rules in lang.terms/

| rule | covered? | evidence |
|------|----------|----------|
| define.directives.terms | n/a | no forbid/prefer/require terms in file |
| define.exec-vs-apply | n/a | no exec/apply terms in file |
| define.prodcode-testcode | n/a | no prodcode/testcode terms in file |
| rule.forbid.gerunds | **yes** | r7 step 3.1 checked all text |
| forbidden term rules (7 total) | **yes** | r7 step 3.3 checked for all forbidden terms |
| rule.prefer.term-supplier | n/a | no supplier context |
| rule.require.order.noun_adj | n/a | no compound names in file |
| rule.require.treestruct | n/a | config file, not procedure |
| rule.require.ubiqlang | **yes** | r7 step 3.2 checked all terms |

### line-by-line term check for boot.yml

| line | text | term check |
|------|------|------------|
| 1 | `# .agent/repo=.this/role=any/boot.yml` | path format, no terms |
| 3 | `controls which briefs are said` | "briefs", "said" = canonical |
| 3 | `vs reffed (pointer only)` | "reffed", "pointer" = canonical |
| 4 | `unmatched briefs become refs` | "unmatched", "refs" = canonical |
| 6 | `briefs:` | yaml key, canonical |
| 7 | `say:` | yaml key, canonical |
| 8 | `core identity - always boot these` | "identity", "boot" = canonical |
| 11 | `actively used patterns` | "patterns" = canonical |
| 15 | `test patterns (frequently referenced)` | "patterns", "referenced" = canonical |

all terms are canonical per ubiqlang. no forbidden terms. no gerunds.

---

## step 3: lang.tones directory coverage

### rules in lang.tones/

| rule | covered? | evidence |
|------|----------|----------|
| define.why-seaturtles-love-software | n/a | philosophy, not enforcement |
| rule.forbid.buzzwords | **yes** | r7 step 4.2 checked all text |
| rule.forbid.shouts | **yes** | r7 step 4.3 checked for ALL CAPS |
| rule.im_an.ehmpathy_seaturtle | n/a | personality, not enforcement |
| rule.prefer.chill-nature-emojis | n/a | no emojis in yaml config |
| rule.prefer.lowercase | **yes** | r7 step 4.1 checked all comments |
| rule.require.term-human | n/a | no references to users in file |

### line-by-line tone check for boot.yml

| line | text | lowercase? | buzzword? | shouts? |
|------|------|------------|-----------|---------|
| 1 | `# .agent/repo=.this/role=any/boot.yml` | yes | no | no |
| 3 | `controls which briefs are said` | yes | no | no |
| 4 | `unmatched briefs become refs` | yes | no | no |
| 8 | `core identity - always boot these` | yes | no | no |
| 11 | `actively used patterns` | yes | no | no |
| 15 | `test patterns (frequently referenced)` | yes | no | no |

all comments are lowercase. no buzzwords. no shouts.

---

## step 4: code.prod directory coverage

### subdirectories in code.prod/

| subdirectory | applicable? | why |
|--------------|-------------|-----|
| consistent.artifacts | no | yaml, not package.json |
| consistent.contracts | no | yaml, not typescript |
| evolvable.architecture | no | config, not code architecture |
| evolvable.domain.objects | no | yaml, not domain objects |
| evolvable.domain.operations | no | yaml, not operations |
| evolvable.procedures | no | yaml, not procedures |
| evolvable.repo.structure | partial | file placement matters |
| pitofsuccess.errors | no | yaml, not error code |
| pitofsuccess.procedures | no | yaml, not procedures |
| pitofsuccess.typedefs | no | yaml, not typedefs |
| readable.comments | partial | yaml has comments |
| readable.narrative | no | yaml, not code narrative |
| readable.persistence | no | yaml, not persistence code |

### applicable code.prod checks

#### evolvable.repo.structure

| rule | check | result |
|------|-------|--------|
| rule.forbid.barrel-exports | n/a | yaml, not index.ts |
| rule.forbid.index-ts | n/a | yaml, not index.ts |
| rule.prefer.dot-dirs | n/a | file is not a directory |
| rule.require.directional-deps | n/a | yaml, not imports |

boot.yml is placed in `.agent/repo=.this/role=any/` which is correct per the `.agent/` directory convention.

#### readable.comments

| rule | check | result |
|------|-------|--------|
| rule.require.what-why-headers | partial | header explains what file does |

the header comment block (lines 1-4) explains:
- **what**: "controls which briefs are said vs reffed"
- **why**: implied by file purpose (curation)

this is sufficient for a config file. full `.what` / `.why` jsdoc format is for procedures.

---

## step 5: code.test directory coverage

not applicable. no tests were added in this change.

the change is config-only. the machinery that processes boot.yml has extant test coverage in `computeBootPlan.test.ts`.

---

## step 6: work.flow directory coverage

not applicable. no git/release/workflow changes in this change.

---

## step 7: are any standards absent that should be present?

### checklist

| question | answer |
|----------|--------|
| error paths? | n/a — yaml config, no error paths |
| validation? | n/a — yaml syntax, no runtime validation needed |
| tests? | n/a — extant tests cover boot.yml machinery |
| types? | n/a — yaml config, no typescript types |
| idempotency? | n/a — yaml config, declarative |
| fail-fast? | n/a — yaml config, no runtime code |

no absent patterns. the change is a single yaml config file. all applicable standards are covered.

---

## summary

| standard category | total rules | applicable | covered | absent |
|-------------------|-------------|------------|---------|--------|
| lang.terms | 15 | 2 | 2 | 0 |
| lang.tones | 7 | 3 | 3 | 0 |
| code.prod | ~40 | 2 | 2 | 0 |
| code.test | ~10 | 0 | n/a | 0 |
| work.flow | ~10 | 0 | n/a | 0 |

**verdict:** all applicable mechanic role standards are covered. no standards were skipped. no patterns are absent that should be present.

---

## why this holds

### the file is config, not code

boot.yml is a yaml configuration file. it declares intent (which briefs to say) but contains no executable code. this means:

1. **code.prod rules** — most do not apply because there is no typescript code
2. **code.test rules** — no tests needed because no new code was added
3. **work.flow rules** — no git/release changes

### applicable standards are term and tone rules

the standards that apply to all text are:
- **gerund prohibition** — checked, none found
- **ubiqlang** — checked, all terms canonical
- **lowercase preference** — checked, all lowercase
- **buzzword prohibition** — checked, none found
- **shout prohibition** — checked, none found

### line-by-line verification

each line of boot.yml was checked against applicable standards:
- lines 1, 3-4: header comments — lowercase, canonical terms, no gerunds
- lines 6-7: yaml keys — canonical terms (briefs, say)
- lines 8, 11, 15: section comments — lowercase, canonical terms, no gerunds
- lines 9-10, 12-14, 16-17: brief paths — no text to check

### no absent patterns

the checklist in step 7 confirms no required patterns are absent:
- no error paths needed (yaml config)
- no validation needed (yaml config)
- no tests needed (extant coverage)
- no types needed (yaml config)
- no idempotency needed (declarative config)
- no fail-fast needed (no runtime code)

### conclusion

coverage is complete because:
1. all rule directories were enumerated
2. each rule was checked for applicability
3. each applicable rule was verified in the adherance review
4. line-by-line analysis confirms no gaps
5. absent pattern checklist shows no absent standards

