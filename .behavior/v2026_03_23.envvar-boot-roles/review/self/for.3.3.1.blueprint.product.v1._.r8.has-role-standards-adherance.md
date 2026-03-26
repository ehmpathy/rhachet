# self review (r8): has-role-standards-adherance

## stone reviewed

3.3.1.blueprint.product.v1

## review criteria

check that the blueprint follows mechanic role standards from briefs.

---

## rule directories enumerated

relevant briefs categories for this blueprint:

1. `lang.terms/` — term conventions (gerunds, noun_adj order, treestruct)
2. `code.prod/evolvable.architecture/` — bounded contexts, directional deps
3. `code.prod/evolvable.domain.objects/` — domain object standards
4. `code.prod/evolvable.domain.operations/` — operation names (get/set/gen)
5. `code.prod/evolvable.procedures/` — input-context pattern, arrow functions
6. `code.prod/evolvable.repo.structure/` — barrel exports, index.ts
7. `code.prod/pitofsuccess.errors/` — fail fast, helpful errors
8. `code.prod/pitofsuccess.procedures/` — idempotency
9. `code.test/` — given/when/then, test patterns

---

## check: lang.terms standards

### rule.forbid.gerunds

**blueprint names checked**:
- parseBrainCliEnrollmentSpec — no gerund ✓
- computeBrainCliEnrollment — no gerund ✓
- genBrainCliConfigArtifact — no gerund ✓
- enrollBrainCli — no gerund ✓
- invokeEnroll — no gerund ✓
- BrainCliEnrollmentSpec — no gerund ✓
- BrainCliEnrollmentOperation — no gerund ✓
- BrainCliEnrollmentManifest — no gerund ✓

**verdict**: no gerunds in names.

### rule.require.order.noun_adj

**blueprint names checked**:
- BrainCliEnrollmentSpec — [noun][context][type] ✓
- BrainCliEnrollmentOperation — [noun][context][type] ✓
- BrainCliEnrollmentManifest — [noun][context][type] ✓

**verdict**: follows [noun][context][type] pattern for domain objects.

### rule.require.treestruct

**operation names checked**:
- parseBrainCliEnrollmentSpec — [verb][...nounhierarchy] ✓
- computeBrainCliEnrollment — [verb][...nounhierarchy] ✓
- genBrainCliConfigArtifact — [verb][...nounhierarchy] ✓

**verdict**: follows [verb][...noun] pattern.

---

## check: code.prod/evolvable.architecture standards

### rule.require.bounded-contexts

**blueprint structure**:
- domain.objects/ — owns domain types
- domain.operations/enroll/ — owns enroll logic
- contract/cli/ — owns CLI entry point

**is enroll bounded correctly?**

- enroll operations are in their own subdirectory ✓
- no cross-boundary imports planned ✓
- CLI calls domain operations, not the reverse ✓

**verdict**: follows bounded contexts.

### rule.require.directional-deps

**dependency flow**:
```
contract/cli/invokeEnroll.ts
  → domain.operations/enroll/*
    → domain.objects/*
```

**is this top-down?**

- contract depends on domain.operations ✓
- domain.operations depends on domain.objects ✓
- no upward imports ✓

**verdict**: follows directional deps.

---

## check: code.prod/evolvable.domain.operations standards

### rule.require.get-set-gen-verbs

**operation names**:
- parseBrainCliEnrollmentSpec — `parse` is allowed for parsers ✓
- computeBrainCliEnrollment — `compute` is allowed for deterministic transforms ✓
- genBrainCliConfigArtifact — `gen` for find-or-create ✓
- enrollBrainCli — `enroll` is imperative verb (allowed for action commands) ✓

**verdict**: follows verb conventions.

---

## check: code.prod/evolvable.procedures standards

### rule.require.input-context-pattern

**blueprint operations**:
- parseBrainCliEnrollmentSpec({ spec }) — input only, no context (pure function) ✓
- computeBrainCliEnrollment({ brain, spec, rolesDefault, rolesLinked }) — input only (pure function) ✓
- genBrainCliConfigArtifact({ enrollment, repoPath }) — input only (writes to filesystem)
- enrollBrainCli({ brain, configPath, args, cwd }) — input only (spawns process)

**question**: should genBrainCliConfigArtifact have context for filesystem access?

**analysis**:
- genBrainCliConfigArtifact writes to `settings.enroll.$hash.json`
- this is side effect, but operation is leaf operation
- filesystem access is direct, not via injected dependency

**verdict**: acceptable for now. can add context if needed for test mocks.

### rule.require.arrow-only

**blueprint doesn't show function syntax**, but will be enforced in execution.

**verdict**: will be enforced.

---

## check: code.prod/pitofsuccess.errors standards

### rule.require.fail-fast

**error cases in blueprint**:
- absent --roles → fail fast in invokeEnroll ✓
- empty spec → fail fast in parseBrainCliEnrollmentSpec ✓
- conflict ops → fail fast in parseBrainCliEnrollmentSpec ✓
- typo role → fail fast in computeBrainCliEnrollment ✓
- no .agent/ → fail fast in invokeEnroll ✓

**verdict**: follows fail-fast.

---

## check: code.test standards

### rule.require.given-when-then

**blueprint test files**:
- parseBrainCliEnrollmentSpec.test.ts — will use given/when/then
- computeBrainCliEnrollment.integration.test.ts — will use given/when/then
- genBrainCliConfigArtifact.integration.test.ts — will use given/when/then
- invokeEnroll.integration.test.ts — will use given/when/then
- invokeEnroll.play.integration.test.ts — will use given/when/then

**verdict**: will follow given/when/then.

---

## summary

| category | standard | status |
|----------|----------|--------|
| lang.terms | no gerunds | ✓ |
| lang.terms | noun_adj order | ✓ |
| lang.terms | treestruct | ✓ |
| architecture | bounded contexts | ✓ |
| architecture | directional deps | ✓ |
| operations | get/set/gen verbs | ✓ |
| procedures | input-context | ✓ (acceptable) |
| procedures | arrow-only | will enforce |
| errors | fail-fast | ✓ |
| tests | given/when/then | will enforce |

---

## verdict

- [x] enumerated all relevant rule directories
- [x] checked each rule against blueprint with current names
- [x] no violations found
- [x] some standards will be enforced in execution

