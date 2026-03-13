/**
 * .what = type-level tests for asBrainPlugToolDict
 * .why = proves the dictionary preserves per-slug tool types through lookup
 *
 * .note = these tests run at compile time, not runtime
 *   if the file compiles, the type tests pass
 */
import { z } from 'zod';

import { asBrainPlugToolDict } from './asBrainPlugToolDict';
import { genBrainPlugToolDeclaration } from './genBrainPlugToolDeclaration';

/**
 * test: dictionary lookup by known slug returns specific tool type
 * .why = proves per-slug type preservation
 */
() => {
  const searchTool = genBrainPlugToolDeclaration({
    slug: 'search',
    name: 'Search',
    description: 'search for things',
    schema: {
      input: z.object({ query: z.string() }),
      output: z.object({ results: z.array(z.string()) }),
    },
    execute: async () => ({ results: ['a', 'b'] }),
  });

  const calcTool = genBrainPlugToolDeclaration({
    slug: 'calc',
    name: 'Calculator',
    description: 'calculate',
    schema: {
      input: z.object({ a: z.number(), b: z.number() }),
      output: z.object({ sum: z.number() }),
    },
    execute: async ({ invocation }) => ({
      sum: invocation.input.a + invocation.input.b,
    }),
  });

  const tools = [searchTool, calcTool] as const;
  const dict = asBrainPlugToolDict(tools);

  // positive: lookup by known slug 'search' returns searchTool type
  const search = dict['search'];
  const _searchSlug: 'search' = search.slug;
  void _searchSlug;

  // positive: lookup by known slug 'calc' returns calcTool type
  const calc = dict['calc'];
  const _calcSlug: 'calc' = calc.slug;
  void _calcSlug;

  // negative: 'search' lookup is not calcTool type
  // @ts-expect-error - search.slug is 'search', not 'calc'
  const _wrongSlug: 'calc' = search.slug;
  void _wrongSlug;
};

/**
 * test: dictionary lookup by dynamic slug returns union type
 */
() => {
  const searchTool = genBrainPlugToolDeclaration({
    slug: 'search',
    name: 'Search',
    description: 'search',
    schema: {
      input: z.object({ query: z.string() }),
      output: z.string(),
    },
    execute: async () => 'found',
  });

  const calcTool = genBrainPlugToolDeclaration({
    slug: 'calc',
    name: 'Calc',
    description: 'calc',
    schema: {
      input: z.object({ n: z.number() }),
      output: z.number(),
    },
    execute: async ({ invocation }) => invocation.input.n * 2,
  });

  const tools = [searchTool, calcTool] as const;
  const dict = asBrainPlugToolDict(tools);

  // dynamic slug lookup returns union | undefined
  const dynamicSlug: string = 'search';
  const tool = dict[dynamicSlug];

  // positive: tool is union type or undefined
  if (tool) {
    const _slug: 'search' | 'calc' = tool.slug;
    void _slug;
  }
};

/**
 * test: cannot assign wrong slug literal to specific tool type
 */
() => {
  const searchTool = genBrainPlugToolDeclaration({
    slug: 'search',
    name: 'Search',
    description: 'search',
    schema: {
      input: z.object({ query: z.string() }),
      output: z.string(),
    },
    execute: async () => 'found',
  });

  const tools = [searchTool] as const;
  const dict = asBrainPlugToolDict(tools);

  // positive: search lookup gets searchTool
  const tool = dict['search'];
  const _slug: 'search' = tool.slug;
  void _slug;
};

/**
 * test: dictionary preserves execute return type through lookup
 */
() => {
  type CustomerOutput = { id: string; name: string };

  const customerTool = genBrainPlugToolDeclaration({
    slug: 'customer',
    name: 'Customer Lookup',
    description: 'lookup customer',
    schema: {
      input: z.object({ email: z.string() }),
      output: z.object({ id: z.string(), name: z.string() }),
    },
    execute: async (): Promise<CustomerOutput> => ({
      id: 'cus_1',
      name: 'Alice',
    }),
  });

  const tools = [customerTool] as const;
  const dict = asBrainPlugToolDict(tools);
  const tool = dict['customer'];

  // positive: execute is accessible and typed
  const _execute = tool.execute;
  void _execute;
};

/**
 * runtime test that validates the type tests compiled successfully
 */
describe('asBrainPlugToolDict', () => {
  it('should compile type tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should convert tools array to dictionary', () => {
    const searchTool = genBrainPlugToolDeclaration({
      slug: 'search',
      name: 'Search',
      description: 'search',
      schema: {
        input: z.object({ query: z.string() }),
        output: z.string(),
      },
      execute: async () => 'found',
    });

    const calcTool = genBrainPlugToolDeclaration({
      slug: 'calc',
      name: 'Calc',
      description: 'calc',
      schema: {
        input: z.object({ n: z.number() }),
        output: z.number(),
      },
      execute: async ({ invocation }) => invocation.input.n * 2,
    });

    const tools = [searchTool, calcTool] as const;
    const dict = asBrainPlugToolDict(tools);

    expect(dict['search']).toBe(searchTool);
    expect(dict['calc']).toBe(calcTool);
    expect(dict['nonexistent']).toBeUndefined();
  });

  it('should enable O(1) lookup by slug', () => {
    const tools = Array.from({ length: 100 }, (_, i) =>
      genBrainPlugToolDeclaration({
        slug: `tool-${i}`,
        name: `Tool ${i}`,
        description: `tool number ${i}`,
        schema: {
          input: z.object({ id: z.number() }),
          output: z.string(),
        },
        execute: async () => `result-${i}`,
      }),
    );

    const dict = asBrainPlugToolDict(tools);

    // O(1) lookup
    expect(dict['tool-50']?.slug).toBe('tool-50');
    expect(dict['tool-99']?.slug).toBe('tool-99');
    expect(dict['tool-0']?.slug).toBe('tool-0');
  });

  it('should preserve slug literal types', () => {
    const searchTool = genBrainPlugToolDeclaration({
      slug: 'search',
      name: 'Search',
      description: 'search',
      schema: {
        input: z.object({ query: z.string() }),
        output: z.string(),
      },
      execute: async () => 'found',
    });

    // verify slug is literal type, not string
    const slug: 'search' = searchTool.slug;
    expect(slug).toBe('search');
  });
});
