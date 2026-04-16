# review.self: role-standards-adherance (round 6)

## enumerate rule directories checked

| directory | relevant? | rules checked |
|-----------|-----------|---------------|
| code.prod/evolvable.procedures | yes | input-context, single-responsibility |
| code.prod/evolvable.repo.structure | yes | directional-deps |
| code.prod/pitofsuccess.errors | yes | failfast, failloud (BadRequestError) |
| code.prod/readable.comments | yes | what-why headers |
| code.prod/readable.narrative | yes | early returns, no else branches |
| code.test | yes | given-when-then |
| lang.terms | yes | no gerunds, no forbidden terms |
| lang.tones | yes | lowercase prose |

## file-by-file check against mechanic standards

### file 1: findRolesWithBootableButNoHook.ts

| rule | check | status |
|------|-------|--------|
| input-context | `(input: { registry: RoleRegistry })` | holds |
| single-responsibility | one export, filename matches | holds |
| what-why headers | lines 3-6, 12-15, etc. | holds |
| no gerunds | no -ing words as nouns | holds |
| lowercase prose | `.what`, `.why`, `.note` lowercase | holds |
| no else branches | uses early continue at line 104, 108 | holds |

### file 2: assertRegistryBootHooksDeclared.ts

| rule | check | status |
|------|-------|--------|
| input-context | `(input: { registry: RoleRegistry })` | holds |
| single-responsibility | one export, filename matches | holds |
| what-why headers | lines 10-13, 22-24, etc. | holds |
| failfast | throws immediately on violation | holds |
| failloud | uses `BadRequestError` with context | holds |
| no gerunds | no -ing words as nouns | holds |
| lowercase prose | all prose lowercase | holds |
| no else branches | uses early return at line 70 | holds |

### file 3: test case9 in acceptance test

| rule | check | status |
|------|-------|--------|
| given-when-then | uses `given`, `when`, `then` from test-fns | holds |
| case label | `[case9]` sequential after case8 | holds |
| useBeforeAll | used for setup and result | holds |

## no violations found

all files follow mechanic standards. no anti-patterns or deviations detected.

**why it holds:**

1. **input-context pattern** — both functions take `(input: { ... })` as first arg
2. **single-responsibility** — transformer finds violations, orchestrator throws error
3. **what-why headers** — every function has `.what` and `.why` in jsdoc
4. **failfast + failloud** — `BadRequestError` with violations metadata
5. **no else branches** — early returns/continues throughout
6. **given-when-then** — test follows bdd structure with proper labels

