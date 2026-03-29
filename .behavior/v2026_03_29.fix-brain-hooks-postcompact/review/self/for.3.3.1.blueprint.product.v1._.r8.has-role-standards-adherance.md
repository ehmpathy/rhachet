# self-review r8: has-role-standards-adherance

## rule directories enumerated

relevant briefs/ subdirectories for this blueprint:

| directory | relevance |
|-----------|-----------|
| code.prod/evolvable.architecture | bounded contexts, directional deps |
| code.prod/evolvable.procedures | arrow functions, input-context pattern |
| code.prod/pitofsuccess.errors | fail-fast, error types |
| code.prod/pitofsuccess.typedefs | shapefit, no as-cast |
| code.test/frames.behavior | given-when-then structure |
| lang.terms | treestruct, ubiqlang, gerunds |

---

## rule-by-rule check

### rule.require.arrow-only

**rule:** enforce arrow functions for procedures

**blueprint:** translateHookToClaudeCode remains arrow function (extant)

**adherance:** holds. no `function` keyword introduced.

---

### rule.require.input-context-pattern

**rule:** procedures accept (input, context?)

**blueprint:** translateHookToClaudeCode signature: `(input: { hook: BrainHook })`

**adherance:** holds. follows the input object pattern.

---

### rule.require.fail-fast

**rule:** use early returns and UnexpectedCodePathError for invalid state

**blueprint:** invalid filter.what throws UnexpectedCodePathError

**adherance:** holds. fail-fast on invalid configuration.

---

### rule.forbid.else-branches

**rule:** no else or else-if branches

**blueprint codepath tree:**
```
├── no filter → SessionStart
├── filter.what = valid → that event
├── filter.what = '*' → array
└── filter.what = invalid → throw
```

**adherance:** structure is flat conditionals, not else chains. the codepath tree shows early return pattern.

---

### rule.require.shapefit

**rule:** types must fit; no force casts

**blueprint:** return type changes from single to array

**adherance:** holds. the return type change is a proper signature update, not a cast.

---

### rule.forbid.as-cast

**rule:** no `as X` casts

**blueprint:** no type casts mentioned in codepath

**adherance:** holds. blueprint uses proper types.

---

### rule.require.given-when-then

**rule:** tests use given/when/then structure

**blueprint test table:** shows test cases with input → expected output

**adherance:** test structure not specified in detail, but the test cases map to given-when-then:
- given: hook with specific filter
- when: translated
- then: expected output

---

### rule.require.ubiqlang

**rule:** consistent domain terms

**blueprint terms:**
- `filter.what` — consistent with extant onTool usage
- `boot event` — clear domain term
- `backward compat` — understood industry term

**adherance:** holds. no new ambiguous terms introduced.

---

### rule.require.treestruct

**rule:** use [verb][...noun] for mechanisms

**blueprint function names:**
- `translateHookToClaudeCode` — verb + noun hierarchy
- `translateHookFromClaudeCode` — verb + noun hierarchy

**adherance:** holds. names follow extant pattern.

---

### rule.forbid.gerunds

**rule:** no -ing as nouns

**blueprint text:** no gerund names in proposed code

**adherance:** holds. function names and variable names are clean.

---

### rule.require.directional-deps

**rule:** top-down dependency flow

**blueprint:** translateHook.ts in hooks/ directory, imports from domain types

**adherance:** holds. no upward imports proposed.

---

### rule.require.bounded-contexts

**rule:** domains own their logic

**blueprint:** changes stay within hooks/ module

**adherance:** holds. no reach into other domains.

---

## anti-pattern check

### anti-pattern: mutable state

**blueprint:** return type is array (immutable), no state mutation mentioned

**adherance:** holds.

---

### anti-pattern: premature abstraction

**blueprint:** uses inline array for boot events (single-use)

**adherance:** holds. r3 YAGNI review confirmed this is correct.

---

### anti-pattern: hidden side effects

**blueprint:** translateHook is pure transform (input → output)

**adherance:** holds. no side effects introduced.

---

## lessons

### lesson 1: rule directories are the checklist

the briefs/ subdirectories enumerate what to check:
- code.prod/* for production code rules
- code.test/* for test rules
- lang.* for language and term rules

a walk through each relevant directory ensures complete coverage.

### lesson 2: extant code sets the pattern

the blueprint extends translateHook. the extant function already follows mechanic standards (arrow function, input pattern, etc.). extension inherits these patterns.

### lesson 3: codepath tree reveals structure

the codepath tree in the blueprint shows the logical structure. a flat tree (no nested branches) indicates no else branches. early returns show fail-fast pattern.

---

## final verdict

| rule category | rules checked | violations |
|---------------|---------------|------------|
| code.prod/evolvable.procedures | 3 | 0 |
| code.prod/pitofsuccess.errors | 1 | 0 |
| code.prod/pitofsuccess.typedefs | 2 | 0 |
| code.prod/evolvable.architecture | 2 | 0 |
| code.test | 1 | 0 |
| lang.terms | 3 | 0 |

**verdict: ADHERES** — blueprint follows all relevant mechanic role standards. no violations found.
