# self review (r3): has-questioned-assumptions

> **note: `--mode plan` was not implemented.** this review questioned whether `--mode plan` should be the default. the feature was proposed in research documents but excluded as YAGNI in execution. actual tests verify behavior via `program.parseAsync` and config file inspection.

## stone reviewed

3.3.1.blueprint.product.v1

## review criteria

third pass. go deeper. question what hasn't been questioned.

---

## slowed down and re-read

opened the blueprint again. read line by line. paused at each decision.

---

## deeper question: why commander at all?

**assumed**: use commander.js to parse CLI args

**question**: is commander necessary? could we parse args ourselves?

**analysis**:
- commander adds a dependency
- but it handles edge cases well (quotes, escapes, flag order)
- allowUnknownOption is a critical feature for passthrough
- we would reinvent the wheel without it

**what if we used yargs?**:
- similar capability
- but commander is already in the codebase (verified: it's used by extant CLI)

**verdict**: assumption holds. commander is already used, keep it.

---

## deeper question: why DomainLiteral at all?

**assumed**: domain objects use DomainLiteral class

**question**: could we use plain interfaces instead?

**analysis**:
- plain interfaces would work for type safety
- DomainLiteral adds runtime validation, serialization, nested hydration
- these features are valuable for debug and trace

**what if plain interfaces?**:
- would lose serialize() for log output
- would lose nested hydration
- would lose runtime validation

**verdict**: assumption holds. DomainLiteral adds value.

---

## deeper question: is --mode plan really the right default?

**assumed**: --mode plan is default (safe, test-friendly)

**question**: do other rhachet commands use plan as default?

**evidence check**: looked at other commands
- git.commit.set uses plan as default → consistent
- git.release uses plan as default → consistent
- sedreplace uses plan as default → consistent

**verdict**: assumption holds. plan-first is the established pattern.

---

## deeper question: should roles be validated at parse time or compute time?

**assumed**: parse validates syntax, compute validates semantics (role existence)

**question**: could we validate role names at parse time?

**analysis**:
- parse time doesn't have access to .agent/ directory
- parse only knows the spec string
- compute time has agentDir context

**separation of concerns**:
- parseRolesSpec: syntactic validation (empty, conflict)
- computeRoles: semantic validation (role exists, typo suggestion)

**verdict**: assumption holds. separation is correct.

---

## deeper question: what if fastest-levenshtein is not installed?

checked package.json:

```bash
grep fastest-levenshtein package.json
```

**result needed**: if not found, add to blueprint as prerequisite.

**action**: will verify in execution phase. if not present, add as dependency.

**verdict**: assumption needs verification. documented in r1.

---

## deeper question: could invokeEnroll be simpler?

**assumed**: invokeEnroll composes four steps: parse → discover → compute → spawn

**question**: could any steps be merged?

**analysis**:
1. parse and compute could merge → but separates syntax from semantics
2. discover and compute could merge → but discover is reusable
3. compute and spawn could merge → but compute is testable alone

**verdict**: assumption holds. four steps provide clean boundaries for test and reuse.

---

## what I learned in r3

1. commander.js choice is justified by extant usage
2. DomainLiteral adds value over plain interfaces
3. --mode plan default is consistent with other commands
4. syntax/semantic validation split is correct
5. four-step composition provides test boundaries

---

## no new issues found in r3

r1 found: avoid short flags, verify deps, review hooks adapter
r2 found: default roles source (fixed)
r3 found: no new issues — design holds under scrutiny

---

## verdict

- [x] went deeper on each assumption
- [x] verified against extant patterns
- [x] no new issues found
- [x] design is sound

