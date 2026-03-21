# review.self: has-preserved-test-intentions (r4)

## review scope

verified all test file changes preserve original test intentions. reviewed each modified test file via git diff.

---

## actorAsk.test.ts

### what did this test verify before?

verified that `actor.ask` calls `brain.ask` with the correct input object (prompt, schema, role fields).

### what does it verify after?

verified that `actor.ask` calls `brain.ask` with the correct input object AND that context is undefined when not provided.

### did I change what the test asserts, or fix why it failed?

**strengthened** the assertion. added `undefined` as second argument to `toHaveBeenCalledWith`:

```ts
// before
expect(mock.ask).toHaveBeenCalledWith({ prompt, schema, role });

// after
expect(mock.ask).toHaveBeenCalledWith({ prompt, schema, role }, undefined);
```

**why it holds**: the original intention (verify input is passed correctly) is preserved. the new assertion additionally verifies context flows correctly. no weaken occurred.

---

## actorAct.test.ts

### what did this test verify before?

verified that `actor.act` calls `brain.act` with the correct input object.

### what does it verify after?

verified that `actor.act` calls `brain.act` with the correct input object AND that context is undefined when not provided.

### did I change what the test asserts, or fix why it failed?

**strengthened** the assertion. same pattern as actorAsk.test.ts.

**why it holds**: original intention preserved and extended with context verification.

---

## brainRepl.tool.coordination.test.ts

### what did this test verify before?

verified BrainRepl coordinates tool calls correctly via BrainAtom.

### what does it verify after?

same behavior. only change: added explicit `BrainAtom` type annotation.

### did I change what the test asserts, or fix why it failed?

**no assertion changes**. only type annotation added for clarity after BrainAtom became generic.

```ts
// before
const mockAtom = { ask: jest.fn() };

// after
const mockAtom: BrainAtom = { ask: jest.fn() };
```

**why it holds**: type annotations do not affect runtime behavior. all assertions unchanged.

---

## genContextBrain.test.ts

### what did this test verify before?

verified genContextBrain returns object with `brain.atom.ask` and `brain.repl.ask` that invoke the source brains.

### what does it verify after?

same behavior. only change: replaced inline mock construction with shared `genMockedBrainAtom`/`genMockedBrainRepl` fixtures.

### did I change what the test asserts, or fix why it failed?

**no assertion changes**. refactored mock construction for maintainability.

```ts
// before
const mockAtom = { ask: jest.fn().mockResolvedValue({ output: 'test' }) };

// after
const mockAtom = genMockedBrainAtom({
  onAsk: async () => ({ output: 'test', episode: {}, metrics: {} }),
});
```

**why it holds**: the test still verifies genContextBrain creates correct wrappers. mock construction details moved to shared fixture — same behavior, better reuse.

---

## genContextBrain.integration.test.ts

### what did this test verify before?

verified genContextBrain works with real brain invocations.

### what does it verify after?

same behavior. only change: replaced inline mock construction with shared fixtures.

### did I change what the test asserts, or fix why it failed?

**no assertion changes**. same refactor pattern as unit test.

**why it holds**: assertions unchanged. fixture extraction is internal refactor.

---

## new files

| file | purpose |
|------|---------|
| ContextBrainSupplier.types.test.ts | new type tests for ContextBrainSupplier |
| genContextBrainSupplier.types.test.ts | new type tests for genContextBrainSupplier |

no prior intention to preserve — these are new contracts.

---

## forbidden patterns checklist

| forbidden pattern | found? | evidence |
|-------------------|--------|----------|
| weaken assertions to make tests pass | ✗ no | all assertions strengthened or unchanged |
| remove test cases that "no longer apply" | ✗ no | no test cases removed |
| change expected values to match broken output | ✗ no | no expected values changed |
| delete tests that fail instead of fix code | ✗ no | no tests deleted |

---

## summary

| file | before | after | verdict |
|------|--------|-------|---------|
| actorAsk.test.ts | verify input passed | verify input + context passed | ✓ strengthened |
| actorAct.test.ts | verify input passed | verify input + context passed | ✓ strengthened |
| brainRepl.tool.coordination.test.ts | verify tool coordination | same + type annotation | ✓ unchanged |
| genContextBrain.test.ts | verify wrapper creation | same + shared fixtures | ✓ unchanged |
| genContextBrain.integration.test.ts | verify real invocation | same + shared fixtures | ✓ unchanged |

all test intentions preserved. assertions strengthened or unchanged. no forbidden patterns detected.

