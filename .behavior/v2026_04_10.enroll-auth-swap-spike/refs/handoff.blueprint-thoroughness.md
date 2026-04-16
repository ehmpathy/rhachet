# handoff: how to create thorough blueprints

## the problem

blueprints that only list files and their purposes are not executable. a mechanic cannot implement from:

```
src/domain.operations/foo/
├── [+] getFooBest.ts    # get best foo
└── [+] asFooShape.ts    # parse foo
```

this tells *what* to create but not *how* to implement it.

---

## the solution: seven sections of a thorough blueprint

### 1. architectural vision

**purpose**: show how components relate and data flows through the system

**includes**:
- ascii diagram of data flow between layers
- component responsibilities table (layer, component, responsibility)
- design principles (stateless, idempotent, etc.)

**example**:
```
┌─────────────────┐
│  contract       │ ← parse args, dispatch, format output
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  orchestrator   │ ← coordinate transformers and communicators
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│ xform │ │ comm  │ ← pure logic vs i/o boundary
└───────┘ └───────┘
```

### 2. filediff tree

**purpose**: show which files are created, modified, or retained

**notation**:
- `[+]` = new file
- `[~]` = modified file
- `[○]` = retained (no changes)

**includes**: file path + one-line purpose

### 3. codepath tree

**purpose**: show the structure inside each file

**includes**:
- function signatures
- input/output types
- flow steps for orchestrators

### 4. implementation samples

**purpose**: show actual code that a mechanic can copy and adapt

**includes**:
- complete TypeScript for each operation
- `.what` and `.why` doc comments
- error throw patterns
- return type shapes

**critical**: samples must be syntactically valid and follow all codebase conventions

**example**:
```typescript
/**
 * .what: parse spec words into structured shape
 * .why: transform boundary input into typed domain object
 */
export const asFooShape = (input: {
  from: FooSpecWords;
}): FooSpecShape => {
  const { from: specWords } = input;

  const match = specWords.match(/^(strategy)\((.*)\)$/);
  if (!match) {
    throw new Error(
      `invalid FooSpecWords: expected 'strategy(source)' format, got '${specWords}'`,
    );
  }

  return {
    strategy: match[1] as 'default' | 'pool',
    source: match[2] || null,
  };
};
```

### 5. test specifications

**purpose**: show exactly what each test verifies, in given/when/then format

**includes**:
- test file names with grain (unit, integration, acceptance)
- full test code with assertions
- mock setup patterns

**example**:
```typescript
describe('getFooBest', () => {
  given('pool with multiple items', () => {
    when('all items have capacity', () => {
      then('returns item with highest left capacity', async () => {
        const adapter = mockFooAdapter({
          capacities: [
            { slug: 'A', left: 20 },
            { slug: 'B', left: 90 },
          ],
        });

        const result = await getFooBest({ spec: 'pool(...)' }, { adapter });

        expect(result).toEqual({ slug: 'B', value: 'value-B' });
      });
    });
  });
});
```

### 6. error handle

**purpose**: enumerate all error cases and their semantics

**includes**:
- error taxonomy table (error, layer, exit code, message, recovery)
- exit code semantics (0 = success, 1 = user error, 2 = constraint)
- error propagation diagram

**example**:
| error | layer | exit | message | recovery |
|-------|-------|------|---------|----------|
| invalid spec | parser | 1 | `invalid FooSpecWords: ...` | fix syntax |
| all exhausted | orchestrator | 2 | `all items exhausted` | wait or add |

### 7. edge cases

**purpose**: document non-obvious behaviors for boundary conditions

**format**: scenario, behavior, rationale

**example**:
```
### edge case: single item pool

**scenario**: pool pattern matches exactly one item
**behavior**: works like solo — single item selected if has capacity
**rationale**: pool is a superset of solo; degenerates gracefully
```

---

## optional sections

### adapter implementation guide

when the design uses inversion of control, show:
- supplier responsibility (who implements what)
- example adapter implementation
- adapter discovery mechanism
- adapter registration location

### integration guide

when extant code needs modification, show:
- exact code changes with context
- flag parse additions
- function signature changes

---

## checklist: is the blueprint executable?

a mechanic should be able to answer YES to all:

- [ ] can I draw the data flow from memory after one read?
- [ ] can I copy the implementation samples and adapt them?
- [ ] can I write the tests without new case invention?
- [ ] do I know what errors to throw and when?
- [ ] do I know how edge cases should behave?

if any NO, the blueprint needs more detail.

---

## anti-patterns to avoid

### anti-pattern 1: purpose-only descriptions

**bad**:
```
├── [+] getFooBest.ts    # get best foo from pool
```

**good**:
```
├── [+] getFooBest.ts
│   ├── input: { spec: FooSpecWords }, context: { adapter }
│   ├── output: { value, slug } | { exhausted: true, refreshAt }
│   └── flow:
│       ├── parse spec → shape
│       ├── query adapter.capacity.get.all()
│       ├── filter to left > 0
│       ├── pick highest left
│       └── fetch value
```

### anti-pattern 2: pseudocode samples

**bad**:
```
// parse the spec
// if invalid, throw error
// return the shape
```

**good**: actual TypeScript that compiles

### anti-pattern 3: test file lists without specs

**bad**:
```
└── [+] getFooBest.test.ts    # unit tests
```

**good**: full given/when/then test code

### anti-pattern 4: no error handle section

if the blueprint doesn't say what errors exist, the mechanic will invent them inconsistently

---

## how to retrofit an incomplete blueprint

1. **read the filediff tree** — understand what files exist
2. **add architectural vision** — draw the data flow diagram
3. **add implementation samples** — write actual code for each operation
4. **add test specifications** — write full test code with assertions
5. **add error handle section** — enumerate all throw/return error cases
6. **add edge cases** — document boundary conditions
7. **review with checklist** — verify a mechanic can execute

---

## summary

a thorough blueprint is a **copy-paste-adapt** document. the mechanic should spend time on:
- adapt samples to exact codebase patterns
- write the actual test fixtures
- handle integration details

the mechanic should NOT spend time on:
- invent the architecture
- decide what errors to throw
- figure out edge case behavior

the blueprint author has already made those decisions. the blueprint captures them.
