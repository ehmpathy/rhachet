# self-review r6: role-standards-adherance

review for adherance to mechanic role standards.

---

## step 1: enumerate relevant rule directories

the mechanic role has these briefs categories:

| category | path | relevant to this change? |
|----------|------|-------------------------|
| lang.terms | briefs/practices/lang.terms/ | yes — for term consistency |
| lang.tones | briefs/practices/lang.tones/ | yes — for tone in comments |
| code.prod | briefs/practices/code.prod/ | limited — this is config, not code |
| code.test | briefs/practices/code.test/ | no — no tests added |
| work.flow | briefs/practices/work.flow/ | limited — no git/release concerns |

**focus areas:** lang.terms and lang.tones apply to the comment text in boot.yml.

---

## step 2: identify what changed

```
A  .agent/repo=.this/role=any/boot.yml
```

this is a yaml config file with:
- 4 comment lines (header + explanation)
- 3 section comment lines
- yaml structure (`briefs:`, `say:`)
- 7 brief paths

---

## step 3: check lang.terms standards

### rule.forbid.gerunds

the file contains these text fragments:

| line | text | has gerund? |
|------|------|-------------|
| 3 | "controls which briefs are said" | no |
| 4 | "unmatched briefs become refs automatically" | no |
| 8 | "core identity - always boot these" | no |
| 11 | "actively used patterns" | no |
| 15 | "test patterns (frequently referenced)" | no |

**holds:** no gerunds detected.

### rule.require.ubiqlang

| term | usage | correct? |
|------|-------|----------|
| briefs | yaml key and comment | yes — canonical |
| said | comment | yes — matches say/ref vocabulary |
| reffed | comment | yes — matches say/ref vocabulary |
| inline | comment | yes — describes behavior |
| pointer | comment | yes — describes ref behavior |

**holds:** all terms are canonical per rhachet vocabulary.

### rule.require.order.noun_adj

not applicable — no compound names in this file.

### rule.require.treestruct

not applicable — this is config, not a procedure name.

---

## step 4: check lang.tones standards

### rule.prefer.lowercase

| line | text | lowercase? |
|------|------|------------|
| 3 | "controls which briefs are said" | yes |
| 4 | "unmatched briefs become refs automatically" | yes |
| 8 | "core identity - always boot these" | yes |
| 11 | "actively used patterns" | yes |
| 15 | "test patterns (frequently referenced)" | yes |

**holds:** all comment text is lowercase.

### rule.forbid.buzzwords

| line | text | has buzzword? |
|------|------|---------------|
| 3 | "controls which briefs are said" | no |
| 4 | "unmatched briefs become refs" | no |
| 8 | "core identity" | no — specific intent |
| 11 | "actively used patterns" | no |
| 15 | "test patterns" | no |

**holds:** no buzzwords detected.

### rule.forbid.shouts

| text | has ALLCAPS? |
|------|--------------|
| entire file | no |

**holds:** no capital acronyms or shouts.

---

## step 5: check code.prod standards (applicable subset)

### rule.require.pinned-versions

not applicable — this is config, not package.json.

### rule.forbid.barrel-exports

not applicable — this is yaml, not typescript.

### rule.require.what-why-headers

not applicable — this is config, not a procedure.

**note:** boot.yml has header comments that explain purpose, which aligns with the spirit of documentation requirements.

---

## step 6: check for anti-patterns

| anti-pattern | present? |
|--------------|----------|
| magic values without context | no — paths are self-explanatory |
| unclear abbreviations | no — all terms are spelled out |
| inconsistent indentation | no — standard yaml 2-space |
| end-of-line whitespace | no |
| mixed tabs/spaces | no — spaces only |

---

## step 7: check yaml standards

| check | pass? |
|-------|-------|
| valid yaml syntax | yes |
| consistent indentation | yes (2 spaces) |
| comments start with `# ` | yes |
| no extra commas | yes (yaml doesn't use them) |

---

## summary

| standard category | violations |
|-------------------|------------|
| lang.terms | none |
| lang.tones | none |
| code.prod (applicable) | none |
| yaml conventions | none |
| anti-patterns | none |

**verdict:** the boot.yml adheres to all applicable mechanic role standards. no violations. no bad practices. no deviations from conventions.

---

## why this holds

the execution added a yaml config file that:

1. **uses correct terms** — briefs, say, ref are canonical vocabulary
2. **uses lowercase** — all comments are lowercase as required
3. **avoids gerunds** — checked line by line, none found
4. **avoids buzzwords** — terms are specific and clear
5. **follows yaml conventions** — proper indentation, valid syntax

the file is minimal and follows established patterns from other boot.yml files in the codebase. no new patterns were introduced that could violate standards.
