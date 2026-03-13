/**
 * .what = type-level tests for BrainAtom schema inference and tool support
 * .why = verifies type-safe .ask() output via zod schemas
 *   and verifies tool calls types narrow correctly via TPlugs generic
 *
 * .note = these tests run at compile time, not runtime
 *   if the file compiles, the type tests pass
 */
import { z } from 'zod';

import { genBrainPlugToolDeclaration } from '@src/domain.operations/brainContinuation/genBrainPlugToolDeclaration';

import type { BrainAtom } from './BrainAtom';
import type { BrainPlugToolDefinition } from './BrainPlugToolDefinition';
import type { BrainPlugToolExecution } from './BrainPlugToolExecution';
import type { BrainPlugToolInvocation } from './BrainPlugToolInvocation';
import type { BrainRepl } from './BrainRepl';

// declare a mock brain atom for type testing
declare const brainAtom: BrainAtom;
declare const brainRepl: BrainRepl;
declare const brainUnion: BrainAtom | BrainRepl;

/**
 * test: .ask() with default schema returns inferred type
 */
async () => {
  const schema = z.object({ answer: z.string() });
  const result = await brainAtom.ask({
    role: {},
    prompt: 'hello',
    schema: { output: schema },
  });

  // positive: answer exists and is string
  const _answer: string = result.output.answer;

  // negative: nonexistent property
  // @ts-expect-error - 'wrong' property does not exist on { answer: string }
  const _wrong = result.output.wrong;
};

/**
 * test: .ask() with custom schema returns custom type
 */
async () => {
  const schema = z.object({
    score: z.number(),
    label: z.string(),
    tags: z.array(z.string()),
  });
  const result = await brainAtom.ask({
    role: {},
    prompt: 'rate this',
    schema: { output: schema },
  });

  // positive: custom properties exist with correct types
  const _score: number = result.output.score;
  const _label: string = result.output.label;
  const _tags: string[] = result.output.tags;

  // negative: answer does not exist on custom schema
  // @ts-expect-error - 'answer' property does not exist on custom schema
  const _answer = result.output.answer;

  // negative: wrong type assignment
  // @ts-expect-error - score is number, not string
  const _wrongType: string = result.output.score;
};

/**
 * test: .ask() with nested schema returns nested type
 */
async () => {
  const schema = z.object({
    user: z.object({
      name: z.string(),
      age: z.number(),
    }),
    outputMeta: z.object({
      createdAt: z.string(),
    }),
  });
  const result = await brainAtom.ask({
    role: {},
    prompt: 'get user',
    schema: { output: schema },
  });

  // positive: nested properties accessible
  const _name: string = result.output.user.name;
  const _age: number = result.output.user.age;
  const _createdAt: string = result.output.outputMeta.createdAt;

  // negative: wrong nested property
  // @ts-expect-error - 'email' does not exist on user
  const _email = result.output.user.email;
};

/**
 * test: schema is required
 */
async () => {
  // @ts-expect-error - schema is required
  await brainAtom.ask({
    role: {},
    prompt: 'hello',
  });
};

/**
 * test: no tools plugged → output is TOutput (never null)
 */
async () => {
  const schema = z.object({ answer: z.string() });
  const result = await brainAtom.ask({
    role: {},
    prompt: 'hello',
    schema: { output: schema },
    // no plugs with tools
  });

  // positive: output is directly assignable to TOutput (no null check needed)
  const _answer: string = result.output.answer;

  // positive: calls is null when no tools plugged
  const _calls: null = result.calls;
};

/**
 * test: no tools plugged → calls is null
 */
async () => {
  const schema = z.object({ answer: z.string() });
  const result = await brainAtom.ask({
    role: {},
    prompt: 'hello',
    schema: { output: schema },
    plugs: {}, // empty plugs, no tools
  });

  // positive: calls is null
  const _calls: null = result.calls;
};

/**
 * test: with tools plugged → output is TOutput | null (requires null check)
 */
async () => {
  const schema = z.object({ answer: z.string() });
  const tools: BrainPlugToolDefinition[] = [];
  const result = await brainAtom.ask({
    role: {},
    prompt: 'hello',
    schema: { output: schema },
    plugs: { tools },
  });

  // negative: cannot access output.answer without null check
  // @ts-expect-error - result.output may be null when tools are plugged
  const _answer: string = result.output.answer;

  // positive: after null check, output is TOutput
  if (result.output !== null) {
    const _checkedAnswer: string = result.output.answer;
  }
};

/**
 * test: with tools plugged → calls is { tools: BrainPlugToolInvocation[] } | null
 */
async () => {
  const schema = z.object({ answer: z.string() });
  const tools: BrainPlugToolDefinition[] = [];
  const result = await brainAtom.ask({
    role: {},
    prompt: 'hello',
    schema: { output: schema },
    plugs: { tools },
  });

  // negative: cannot access calls.tools without null check
  // @ts-expect-error - result.calls may be null when tools are plugged
  const _tools: BrainPlugToolInvocation[] = result.calls.tools;

  // positive: after null check, calls.tools is BrainPlugToolInvocation[]
  if (result.calls !== null) {
    const _checkedTools: BrainPlugToolInvocation[] = result.calls.tools;
  }
};

/**
 * test: BrainPlugToolInvocation has exid, slug, input properties
 */
async () => {
  const schema = z.object({ answer: z.string() });
  const tools: BrainPlugToolDefinition[] = [];
  const result = await brainAtom.ask({
    role: {},
    prompt: 'hello',
    schema: { output: schema },
    plugs: { tools },
  });

  if (result.calls !== null) {
    const invocation = result.calls.tools[0];
    if (invocation) {
      // positive: invocation has exid, slug, input
      const _exid: string = invocation.exid;
      const _slug: string = invocation.slug;
      const _input: unknown = invocation.input;

      // negative: nonexistent property
      // @ts-expect-error - 'wrong' property does not exist on BrainPlugToolInvocation
      const _wrong = invocation.wrong;
    }
  }
};

/**
 * test: BrainAtom | BrainRepl union is callable via .ask()
 * .why = guarantees brain.ask() works when brain = BrainAtom | BrainRepl
 */
async () => {
  const schema = z.object({ answer: z.string() });

  // positive: can call .ask() on union type without cast
  const result = await brainUnion.ask({
    role: {},
    prompt: 'hello',
    schema: { output: schema },
  });

  // positive: output is accessible (may need null check if tools were plugged)
  const _output = result.output;

  // positive: calls is accessible
  const _calls = result.calls;
};

/**
 * test: BrainRepl.ask() is callable with same signature as BrainAtom.ask()
 * .why = guarantees symmetric contracts for atom and repl
 */
async () => {
  const schema = z.object({ answer: z.string() });

  // both should be callable with identical input shape
  const atomResult = await brainAtom.ask({
    role: {},
    prompt: 'hello',
    schema: { output: schema },
  });

  const replResult = await brainRepl.ask({
    role: {},
    prompt: 'hello',
    schema: { output: schema },
  });

  // both have output and calls properties
  const _atomOutput = atomResult.output;
  const _atomCalls = atomResult.calls;
  const _replOutput = replResult.output;
  const _replCalls = replResult.calls;
};

/**
 * test: function that takes BrainAtom | BrainRepl can call .ask() without cast
 * .why = guarantees that generic code can work with either brain type
 */
async () => {
  const schema = z.object({ answer: z.string() });

  // positive: function can take union and call .ask()
  const askBrain = async (brain: BrainAtom | BrainRepl) => {
    return brain.ask({
      role: {},
      prompt: 'hello',
      schema: { output: schema },
    });
  };

  // positive: can pass either type to the function
  const _atomResult = await askBrain(brainAtom);
  const _replResult = await askBrain(brainRepl);
  const _unionResult = await askBrain(brainUnion);
};

/**
 * test: BrainAtom | BrainRepl union with tools plugged
 * .why = guarantees union callable works with full plugs signature
 */
async () => {
  const schema = z.object({ answer: z.string() });
  const tools: BrainPlugToolDefinition[] = [];

  // positive: can call .ask() with tools on union type
  const result = await brainUnion.ask({
    role: {},
    prompt: 'hello',
    schema: { output: schema },
    plugs: { tools },
  });

  // positive: output and calls are accessible (with null checks for tools mode)
  if (result.output !== null) {
    const _answer: string = result.output.answer;
  }
  if (result.calls !== null) {
    const _tools: BrainPlugToolInvocation[] = result.calls.tools;
  }
};

/**
 * test: BrainAtom and BrainRepl results are assignable to common type
 * .why = guarantees results can be handled uniformly
 */
async () => {
  const schema = z.object({ answer: z.string() });

  const atomResult = await brainAtom.ask({
    role: {},
    prompt: 'hello',
    schema: { output: schema },
  });

  const replResult = await brainRepl.ask({
    role: {},
    prompt: 'hello',
    schema: { output: schema },
  });

  // positive: both results assignable to array of same type
  const results = [atomResult, replResult];

  // positive: can iterate and access properties uniformly
  for (const result of results) {
    const _output = result.output;
    const _calls = result.calls;
  }
};

/**
 * test: prompt accepts string for initial prompt (no tools)
 */
async () => {
  const schema = z.object({ answer: z.string() });

  // positive: prompt can be string when no tools
  await brainAtom.ask({
    role: {},
    prompt: 'hello world',
    schema: { output: schema },
  });
};

/**
 * test: prompt accepts string when tools are plugged
 */
async () => {
  const schema = z.object({ answer: z.string() });
  const tools: BrainPlugToolDefinition[] = [];

  // positive: prompt can be string with tools (initial prompt)
  await brainAtom.ask({
    role: {},
    prompt: 'hello with tools',
    schema: { output: schema },
    plugs: { tools },
  });
};

/**
 * test: prompt accepts BrainPlugToolExecution[] when tools are plugged
 * .why = enables tool result continuation
 */
async () => {
  const schema = z.object({ answer: z.string() });
  const tools: BrainPlugToolDefinition[] = [];
  const executions: BrainPlugToolExecution[] = [];

  // positive: prompt can be execution array with tools (tool result continuation)
  await brainAtom.ask({
    role: {},
    prompt: executions,
    schema: { output: schema },
    plugs: { tools },
  });
};

/**
 * test: prompt does NOT accept BrainPlugToolExecution[] when no tools
 * .why = type-safe: execution array only valid with tools plugged
 */
async () => {
  const schema = z.object({ answer: z.string() });
  const executions: BrainPlugToolExecution[] = [];

  // negative: prompt cannot be execution array without tools
  await brainAtom.ask({
    role: {},
    // @ts-expect-error - execution array not valid without tools plugged
    prompt: executions,
    schema: { output: schema },
    // no plugs with tools
  });
};

/**
 * test: BrainAtom.ask() returns calls: { tools } | null when tools plugged
 * .why = atoms return tool invocations for caller to handle
 */
async () => {
  const schema = z.object({ answer: z.string() });
  const tools: BrainPlugToolDefinition[] = [];

  const result = await brainAtom.ask({
    role: {},
    prompt: 'hello',
    schema: { output: schema },
    plugs: { tools },
  });

  // positive: calls can be null or have tools
  if (result.calls !== null) {
    const _invocations: BrainPlugToolInvocation[] = result.calls.tools;
  }
};

/**
 * test: BrainRepl.ask() returns calls: null always (repl executes tools internally)
 * .why = repls execute tools via tool.execute(), never return tool invocations
 */
async () => {
  const schema = z.object({ answer: z.string() });
  const tools: BrainPlugToolDefinition[] = [];

  const result = await brainRepl.ask({
    role: {},
    prompt: 'hello',
    schema: { output: schema },
    plugs: { tools },
  });

  // positive: calls is always null for repl
  const _calls: null = result.calls;
};

/**
 * test: BrainRepl.act() returns calls: null always
 * .why = repls execute tools via tool.execute(), never return tool invocations
 */
async () => {
  const schema = z.object({ answer: z.string() });
  const tools: BrainPlugToolDefinition[] = [];

  const result = await brainRepl.act({
    role: {},
    prompt: 'hello',
    schema: { output: schema },
    plugs: { tools },
  });

  // positive: calls is always null for repl
  const _calls: null = result.calls;
};

/**
 * test: BrainPlugToolExecution has typed TInput, TOutput with discriminated union
 * .why = enables type-safe tool result composition via signal check
 */
() => {
  type CustomerInput = { email: string };
  type CustomerOutput = { id: string; name: string };

  const execution = {} as BrainPlugToolExecution<CustomerInput, CustomerOutput>;

  // positive: input is typed
  const _email: string = execution.input.email;

  // positive: signal is constrained
  const _signal: 'success' | 'error:constraint' | 'error:malfunction' =
    execution.signal;

  // positive: metrics has time
  const _time = execution.metrics.cost.time;

  // positive: signal narrows output type
  if (execution.signal === 'success') {
    // when success, output is TOutput
    const _id: string = execution.output.id;
    const _name: string = execution.output.name;
  } else {
    // when error, output is { error: Error }
    const _error: Error = execution.output.error;
  }

  // negative: wrong property on input
  // @ts-expect-error - 'wrong' does not exist on CustomerInput
  const _wrongInput = execution.input.wrong;
};

/**
 * test: BrainPlugToolDefinition for atom has no execute field (via cast)
 * .why = atoms return tool invocations for caller to handle
 */
() => {
  type CustomerInput = { email: string };
  type CustomerOutput = { id: string };

  const atomTool = {} as BrainPlugToolDefinition<
    CustomerInput,
    CustomerOutput,
    'atom'
  >;

  // positive: has slug, name, description, schema
  const _slug: string = atomTool.slug;
  const _name: string = atomTool.name;
  const _description: string = atomTool.description;
  const _schema = atomTool.schema.input;

  // negative: execute does not exist on atom tool
  // @ts-expect-error - 'execute' does not exist on atom tool definition
  const _execute = atomTool.execute;
};

/**
 * test: actual atom tool definition cannot have execute field
 * .why = proves at instantiation that atom tools have no execute
 */
() => {
  // positive: atom tool without execute compiles
  const atomToolGood: BrainPlugToolDefinition<
    { email: string },
    { id: string },
    'atom'
  > = {
    slug: 'lookup-customer',
    name: 'Lookup Customer',
    description: 'lookup a customer by email',
    schema: {
      input: z.object({ email: z.string() }),
      output: z.object({ id: z.string() }),
    },
    // no execute - correct for atom
  };
  void atomToolGood;

  // negative: atom tool with execute errors
  const atomToolBad: BrainPlugToolDefinition<
    { email: string },
    { id: string },
    'atom'
  > = {
    slug: 'lookup-customer',
    name: 'Lookup Customer',
    description: 'lookup a customer by email',
    schema: {
      input: z.object({ email: z.string() }),
      output: z.object({ id: z.string() }),
    },
    // @ts-expect-error - atom tool cannot have execute field
    execute: async () => ({ id: '123' }),
  };
  void atomToolBad;
};

/**
 * test: caller cannot access execute on atom tool
 * .why = even if a repl tool is passed to atom, execute is inaccessible
 */
async () => {
  // define a repl tool with execute via genBrainPlugToolDeclaration
  const replTool = genBrainPlugToolDeclaration({
    slug: 'lookup-customer',
    name: 'Lookup Customer',
    description: 'lookup a customer by email',
    schema: {
      input: z.object({ email: z.string() }),
      output: z.object({ id: z.string() }),
    },
    execute: async () => ({ id: '123' }),
  });

  // use it as atom tool (narrowed to 'atom' grain)
  const atomTools: BrainPlugToolDefinition<
    { email: string },
    { id: string },
    'atom'
  >[] = [replTool];

  // try to access execute on the atom-typed tool
  const tool = atomTools[0];
  if (tool) {
    // @ts-expect-error - execute is not accessible on atom tool type
    const _exec = tool.execute;
    void _exec;
  }
};

/**
 * test: BrainPlugToolDefinition for repl has required execute field
 * .why = repls execute tools via tool.execute()
 */
() => {
  type CustomerInput = { email: string };
  type CustomerOutput = { id: string };

  const replTool = {} as BrainPlugToolDefinition<
    CustomerInput,
    CustomerOutput,
    'repl'
  >;

  // positive: has execute on repl tool
  const _execute = replTool.execute;

  // positive: execute is callable with invocation and context
  // note: execute returns BrainPlugToolExecution (wrapped result)
  const invocation = {} as BrainPlugToolInvocation<CustomerInput>;
  const _result: Promise<
    BrainPlugToolExecution<CustomerInput, CustomerOutput>
  > = replTool.execute({ invocation }, {});
};

/**
 * runtime test that validates the type tests compiled successfully
 * if this file compiles, all type tests pass
 */
describe('BrainAtom types', () => {
  it('should compile type tests successfully', () => {
    // if we reach here, all type tests above compiled successfully
    expect(true).toBe(true);
  });
});
