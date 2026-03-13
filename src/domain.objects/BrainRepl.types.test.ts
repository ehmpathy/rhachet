/**
 * .what = type-level tests for BrainRepl supplier constraints
 * .why = proves that repl suppliers cannot return tool calls
 *   (repls execute tools internally via tool.execute)
 *
 * .note = these tests run at compile time, not runtime
 *   if the file compiles, the type tests pass
 */
import { z } from 'zod';

import { genBrainPlugToolDeclaration } from '@src/domain.operations/brainContinuation/genBrainPlugToolDeclaration';

import type { BrainEpisode } from './BrainEpisode';
import type { BrainOutput } from './BrainOutput';
import type { BrainOutputMetrics } from './BrainOutputMetrics';
import type { BrainPlugToolDefinition } from './BrainPlugToolDefinition';
import type { BrainPlugToolInvocation } from './BrainPlugToolInvocation';
import type { BrainRepl } from './BrainRepl';
import type { BrainSeries } from './BrainSeries';

// declare mocks for type tests
declare const brainRepl: BrainRepl;
declare const episode: BrainEpisode;
declare const series: BrainSeries;
declare const metrics: BrainOutputMetrics;

/**
 * test: BrainRepl.ask() result has calls: null (no tools)
 */
async () => {
  const result = await brainRepl.ask({
    role: {},
    prompt: 'hello',
    schema: { output: z.object({ answer: z.string() }) },
  });

  // positive: calls is null
  const _calls: null = result.calls;
  void _calls;
};

/**
 * test: BrainRepl.ask() result has calls: null (with tools)
 */
async () => {
  const tools = [
    genBrainPlugToolDeclaration({
      slug: 'search',
      name: 'Search',
      description: 'search for things',
      schema: {
        input: z.object({ query: z.string() }),
        output: z.string(),
      },
      execute: async ({ invocation }) => `found: ${invocation.input.query}`,
    }),
  ];

  const result = await brainRepl.ask({
    role: {},
    prompt: 'hello',
    schema: { output: z.object({ answer: z.string() }) },
    plugs: { tools },
  });

  // positive: calls is still null even with tools plugged
  const _calls: null = result.calls;
  void _calls;
};

/**
 * test: BrainRepl.ask() result.calls CANNOT be assigned to tool invocations
 */
async () => {
  const tools = [
    genBrainPlugToolDeclaration({
      slug: 'search',
      name: 'Search',
      description: 'search for things',
      schema: {
        input: z.object({ query: z.string() }),
        output: z.string(),
      },
      execute: async ({ invocation }) => `found: ${invocation.input.query}`,
    }),
  ];

  const result = await brainRepl.ask({
    role: {},
    prompt: 'hello',
    schema: { output: z.object({ answer: z.string() }) },
    plugs: { tools },
  });

  // negative: cannot assign null to { tools } type
  // @ts-expect-error - result.calls is null, not { tools: BrainPlugToolInvocation[] }
  const _calls: { tools: BrainPlugToolInvocation[] } = result.calls;
  void _calls;
};

/**
 * test: BrainRepl.act() result has calls: null
 */
async () => {
  const tools = [
    genBrainPlugToolDeclaration({
      slug: 'write-file',
      name: 'Write File',
      description: 'write to a file',
      schema: {
        input: z.object({ path: z.string() }),
        output: z.boolean(),
      },
      execute: async () => true,
    }),
  ];

  const result = await brainRepl.act({
    role: {},
    prompt: 'write hello.txt',
    schema: { output: z.object({ complete: z.boolean() }) },
    plugs: { tools },
  });

  // positive: calls is null
  const _calls: null = result.calls;
  void _calls;
};

/**
 * test: BrainRepl.act() result.calls CANNOT be assigned to tool invocations
 */
async () => {
  const tools = [
    genBrainPlugToolDeclaration({
      slug: 'write-file',
      name: 'Write File',
      description: 'write to a file',
      schema: {
        input: z.object({ path: z.string() }),
        output: z.boolean(),
      },
      execute: async () => true,
    }),
  ];

  const result = await brainRepl.act({
    role: {},
    prompt: 'write hello.txt',
    schema: { output: z.object({ complete: z.boolean() }) },
    plugs: { tools },
  });

  // negative: cannot assign null to { tools } type
  // @ts-expect-error - result.calls is null for repl
  const _calls: { tools: BrainPlugToolInvocation[] } = result.calls;
  void _calls;
};

/**
 * test: supplier implementing BrainOutput for repl CANNOT return tool calls
 */
() => {
  const invocations: BrainPlugToolInvocation[] = [
    { exid: 'test-123', slug: 'search', input: { query: 'test' } },
  ];

  // supplier tries to return tool invocations for repl
  const badSupplierOutput: BrainOutput<
    { answer: string },
    'repl',
    { tools: BrainPlugToolDefinition[] }
  > = {
    output: { answer: 'hello' },
    // @ts-expect-error - repl output.calls must be null, cannot be { tools: [...] }
    calls: { tools: invocations },
    metrics,
    episode,
    series,
  };
  void badSupplierOutput;
};

/**
 * test: supplier implementing BrainOutput for repl can return null calls
 */
() => {
  const goodSupplierOutput: BrainOutput<
    { answer: string },
    'repl',
    { tools: BrainPlugToolDefinition[] }
  > = {
    output: { answer: 'hello' },
    calls: null, // correct: repl returns null
    metrics,
    episode,
    series,
  };
  void goodSupplierOutput;
};

/**
 * test: repl tools require execute field
 * .note = use genBrainPlugToolDeclaration to create tools with proper execute behavior
 */
() => {
  // positive: repl tool created via genBrainPlugToolDeclaration compiles
  const goodTool = genBrainPlugToolDeclaration({
    slug: 'search',
    name: 'Search',
    description: 'search for things',
    schema: {
      input: z.object({ query: z.string() }),
      output: z.string(),
    },
    execute: async ({ invocation }) => `found: ${invocation.input.query}`,
  });
  void goodTool;

  // negative: repl tool without execute errors
  // @ts-expect-error - repl tool requires execute field
  const badTool: BrainPlugToolDefinition<{ query: string }, string, 'repl'> = {
    slug: 'search',
    name: 'Search',
    description: 'search for things',
    schema: {
      input: z.object({ query: z.string() }),
      output: z.string(),
    },
    // execute absent
  };
  void badTool;
};

/**
 * test: BrainRepl result has series (not null)
 */
async () => {
  const result = await brainRepl.ask({
    role: {},
    prompt: 'hello',
    schema: { output: z.object({ answer: z.string() }) },
  });

  // positive: series is BrainSeries
  const _series: BrainSeries = result.series;
  void _series;
};

/**
 * test: supplier implementing BrainOutput for repl CANNOT return null series
 */
() => {
  const badSupplierOutput: BrainOutput<{ answer: string }, 'repl'> = {
    output: { answer: 'hello' },
    calls: null,
    metrics,
    episode,
    // @ts-expect-error - repl output.series must be BrainSeries, not null
    series: null,
  };
  void badSupplierOutput;
};

/**
 * test: instantiated BrainRepl.ask() implementation CANNOT return tool calls
 * .why = proves at instantiation that repl suppliers cannot output tool invocations
 */
() => {
  // instantiate a BrainRepl with an ask implementation
  const badRepl: BrainRepl = {
    repo: 'test',
    slug: 'bad-repl',
    description: 'a repl that tries to return tool calls',
    spec: {} as any,
    ask: async (): Promise<BrainOutput<any, 'repl', any>> => ({
      output: { answer: 'hello' },
      // @ts-expect-error - repl cannot return calls with tools, must be null
      calls: { tools: [{ exid: 'x', slug: 'y', input: {} }] },
      metrics: {} as any,
      episode: {} as any,
      series: {} as any,
    }),
    act: async (): Promise<BrainOutput<any, 'repl', any>> => ({
      output: { answer: 'hello' },
      calls: null,
      metrics: {} as any,
      episode: {} as any,
      series: {} as any,
    }),
  };
  void badRepl;

  // good repl returns null calls
  const goodRepl: BrainRepl = {
    repo: 'test',
    slug: 'good-repl',
    description: 'a repl that correctly returns null calls',
    spec: {} as any,
    ask: async (): Promise<BrainOutput<any, 'repl', any>> => ({
      output: { answer: 'hello' },
      calls: null, // correct: repl returns null
      metrics: {} as any,
      episode: {} as any,
      series: {} as any,
    }),
    act: async (): Promise<BrainOutput<any, 'repl', any>> => ({
      output: { answer: 'hello' },
      calls: null,
      metrics: {} as any,
      episode: {} as any,
      series: {} as any,
    }),
  };
  void goodRepl;
};

/**
 * test: instantiated BrainRepl.act() implementation CANNOT return tool calls
 * .why = proves at instantiation that repl suppliers cannot output tool invocations from act
 */
() => {
  const badRepl: BrainRepl = {
    repo: 'test',
    slug: 'bad-repl',
    description: 'a repl that tries to return tool calls from act',
    spec: {} as any,
    ask: async (): Promise<BrainOutput<any, 'repl', any>> => ({
      output: { answer: 'hello' },
      calls: null,
      metrics: {} as any,
      episode: {} as any,
      series: {} as any,
    }),
    act: async (): Promise<BrainOutput<any, 'repl', any>> => ({
      output: { complete: true },
      // @ts-expect-error - repl cannot return calls with tools, must be null
      calls: { tools: [{ exid: 'x', slug: 'y', input: {} }] },
      metrics: {} as any,
      episode: {} as any,
      series: {} as any,
    }),
  };
  void badRepl;
};

/**
 * runtime test that validates the type tests compiled successfully
 */
describe('BrainRepl types', () => {
  it('should compile type tests successfully', () => {
    expect(true).toBe(true);
  });
});
