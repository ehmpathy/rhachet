/**
 * .what = playtest for BrainRepl tool coordination
 * .why = proves the contracts enable BrainRepl to coordinate tool execution
 *        via slug lookup, typed execute, and typed execution feedback
 */
import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { genMockedBrainEpisode } from '@src/.test.assets/genMockedBrainEpisode';
import { genMockedBrainOutputMetrics } from '@src/.test.assets/genMockedBrainOutputMetrics';
import { genSampleBrainSpec } from '@src/.test.assets/genSampleBrainSpec';
import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { BrainOutput } from '@src/domain.objects/BrainOutput';
import type { BrainPlugToolExecution } from '@src/domain.objects/BrainPlugToolExecution';
import { BrainPlugToolInvocation } from '@src/domain.objects/BrainPlugToolInvocation';

import { asBrainPlugToolDict } from './asBrainPlugToolDict';
import { genBrainExchange } from './genBrainExchange';
import { genBrainPlugToolDeclaration } from './genBrainPlugToolDeclaration';

describe('brainRepl.tool.coordination', () => {
  const spec = genSampleBrainSpec();

  // shared episode factory via SDK utils
  const createEpisode = async (input: string, output: string) =>
    genMockedBrainEpisode({
      exchange: await genBrainExchange({
        with: { input, output, exid: null },
      }),
    });

  given('[case1] BrainRepl coordinates single tool execution', () => {
    // tool definitions with execute (repl tools)
    type CustomerInput = { email: string };
    type CustomerOutput = { id: string; name: string };

    const customerLookupTool = genBrainPlugToolDeclaration({
      slug: 'customer-lookup',
      name: 'Customer Lookup',
      description: 'lookup customer by email',
      schema: {
        input: z.object({ email: z.string().email() }),
        output: z.object({ id: z.string(), name: z.string() }),
      },
      execute: async ({ invocation }) => {
        // simulate customer lookup
        if (invocation.input.email === 'alice@example.com') {
          return { id: 'cus_123', name: 'Alice' };
        }
        throw new Error('customer not found');
      },
    });

    // mock brain atom that returns tool invocations
    const mockAtom = new BrainAtom({
      repo: 'test',
      slug: 'mock-atom',
      description: 'mock atom for repl coordination test',
      spec,
      ask: async (input): Promise<BrainOutput<any, 'atom', any>> => {
        // continuation: tool executions passed back
        if (Array.isArray(input.prompt)) {
          const summaries = input.prompt.map((e) => {
            const { input: inp, output: out } = z
              .object(customerLookupTool.schema)
              .parse(e);
            return `found ${out.name} (${out.id}) for ${inp.email}`;
          });
          return new BrainOutput({
            output: { summary: summaries.join('; ') },
            calls: null,
            metrics: genMockedBrainOutputMetrics(),
            episode: await createEpisode(
              JSON.stringify(input.prompt),
              summaries.join('; '),
            ),
            series: null,
          });
        }

        // initial: return tool invocation
        if (typeof input.prompt !== 'string')
          throw new Error('expected string prompt');

        return new BrainOutput({
          output: null,
          calls: {
            tools: [
              new BrainPlugToolInvocation<CustomerInput>({
                exid: `inv-${Date.now()}`,
                slug: 'customer-lookup',
                input: { email: 'alice@example.com' },
              }),
            ],
          },
          metrics: genMockedBrainOutputMetrics(),
          episode: await createEpisode(
            input.prompt,
            'tool_use:customer-lookup',
          ),
          series: null,
        });
      },
    });

    when('[t0] repl coordinates tool execution via slug lookup', () => {
      then('repl can lookup tool by slug and execute with types', async () => {
        const tools = [customerLookupTool];

        // step 1: get tool invocation from atom
        const result1 = await mockAtom.ask({
          role: {},
          prompt: 'lookup customer alice@example.com',
          schema: { output: z.object({ summary: z.string() }) },
          plugs: { tools },
        });

        expect(result1.calls?.tools).toHaveLength(1);
        const invocation = result1.calls!.tools[0]!;

        // step 2: lookup tool by slug via dictionary (what BrainRepl does internally)
        const toolDict = asBrainPlugToolDict(tools);
        const tool = toolDict[invocation.slug];
        expect(tool).toBeDefined();

        // step 3: execute tool - returns BrainPlugToolExecution directly
        const execution = await tool!.execute(
          { invocation: invocation as BrainPlugToolInvocation<CustomerInput> },
          {},
        );

        // execution is already wrapped with time, signal, etc.
        expect(execution.output).toEqual({ id: 'cus_123', name: 'Alice' });
        expect(execution.signal).toEqual('success');
        expect(execution.exid).toEqual(invocation.exid);

        // step 4: continue episode with execution
        const result2 = await mockAtom.ask({
          role: {},
          prompt: [execution],
          on: { episode: result1.episode },
          schema: { output: z.object({ summary: z.string() }) },
          plugs: { tools },
        });

        expect(result2.output?.summary).toContain('Alice');
        expect(result2.output?.summary).toContain('cus_123');
      });
    });

    when('[t1] snapshot the coordination flow', () => {
      then('data shapes are captured', async () => {
        const tools = [customerLookupTool];

        const result1 = await mockAtom.ask({
          role: {},
          prompt: 'lookup customer alice@example.com',
          schema: { output: z.object({ summary: z.string() }) },
          plugs: { tools },
        });

        const invocation = result1.calls!.tools[0]!;
        const toolDict = asBrainPlugToolDict(tools);
        const tool = toolDict[invocation.slug]!;

        // execute returns BrainPlugToolExecution directly
        const execution = await tool.execute(
          { invocation: invocation as BrainPlugToolInvocation<CustomerInput> },
          {},
        );

        const result2 = await mockAtom.ask({
          role: {},
          prompt: [execution],
          on: { episode: result1.episode },
          schema: { output: z.object({ summary: z.string() }) },
          plugs: { tools },
        });

        expect({
          invocation: { slug: invocation.slug, input: invocation.input },
          execution: {
            slug: execution.slug,
            input: execution.input,
            output: execution.output,
            signal: execution.signal,
          },
          summary: result2.output?.summary,
        }).toMatchSnapshot();
      });
    });
  });

  given('[case2] BrainRepl coordinates parallel tool executions', () => {
    type InvoiceInput = { customerId: string };
    type InvoiceOutput = { invoices: { id: string; amount: number }[] };

    type SubscriptionInput = { customerId: string };
    type SubscriptionOutput = { subscriptions: { id: string; plan: string }[] };

    const getInvoicesTool = genBrainPlugToolDeclaration({
      slug: 'get-invoices',
      name: 'Get Invoices',
      description: 'get invoices for customer',
      schema: {
        input: z.object({ customerId: z.string() }),
        output: z.object({
          invoices: z.array(z.object({ id: z.string(), amount: z.number() })),
        }),
      },
      execute: async () => ({
        invoices: [
          { id: 'inv_1', amount: 100 },
          { id: 'inv_2', amount: 250 },
        ],
      }),
    });

    const getSubscriptionsTool = genBrainPlugToolDeclaration({
      slug: 'get-subscriptions',
      name: 'Get Subscriptions',
      description: 'get subscriptions for customer',
      schema: {
        input: z.object({ customerId: z.string() }),
        output: z.object({
          subscriptions: z.array(
            z.object({ id: z.string(), plan: z.string() }),
          ),
        }),
      },
      execute: async () => ({
        subscriptions: [{ id: 'sub_1', plan: 'pro' }],
      }),
    });

    // mock atom that returns multiple tool invocations
    const mockAtom = new BrainAtom({
      repo: 'test',
      slug: 'mock-atom-parallel',
      description: 'mock atom for parallel tool test',
      spec,
      ask: async (input): Promise<BrainOutput<any, 'atom', any>> => {
        if (Array.isArray(input.prompt)) {
          // process all executions
          const parts = input.prompt.map((e) => {
            if (e.slug === 'get-invoices') {
              const out = getInvoicesTool.schema.output.parse(e.output);
              return `${out.invoices.length} invoices`;
            }
            if (e.slug === 'get-subscriptions') {
              const out = getSubscriptionsTool.schema.output.parse(e.output);
              return `${out.subscriptions.length} subscriptions`;
            }
            return 'unknown';
          });
          return new BrainOutput({
            output: { analysis: parts.join(', ') },
            calls: null,
            metrics: genMockedBrainOutputMetrics(),
            episode: await createEpisode(
              JSON.stringify(input.prompt),
              parts.join(', '),
            ),
            series: null,
          });
        }

        if (typeof input.prompt !== 'string')
          throw new Error('expected string prompt');

        // return parallel tool invocations
        return new BrainOutput({
          output: null,
          calls: {
            tools: [
              new BrainPlugToolInvocation<InvoiceInput>({
                exid: `inv-invoices-${Date.now()}`,
                slug: 'get-invoices',
                input: { customerId: 'cus_123' },
              }),
              new BrainPlugToolInvocation<SubscriptionInput>({
                exid: `inv-subs-${Date.now()}`,
                slug: 'get-subscriptions',
                input: { customerId: 'cus_123' },
              }),
            ],
          },
          metrics: genMockedBrainOutputMetrics(),
          episode: await createEpisode(input.prompt, 'tool_use:parallel'),
          series: null,
        });
      },
    });

    when('[t0] repl executes tools in parallel via slug lookup', () => {
      then('all tools are executed and results fed back', async () => {
        const tools = [getInvoicesTool, getSubscriptionsTool];

        // step 1: get parallel tool invocations
        const result1 = await mockAtom.ask({
          role: {},
          prompt: 'analyze customer cus_123',
          schema: { output: z.object({ analysis: z.string() }) },
          plugs: { tools },
        });

        expect(result1.calls?.tools).toHaveLength(2);

        // step 2: execute all tools in parallel (what BrainRepl does)
        // note: genBrainPlugToolDeclaration wraps execute to return BrainPlugToolExecution
        const toolDict = asBrainPlugToolDict(tools);
        const executions = await Promise.all(
          result1.calls!.tools.map(async (invocation) => {
            const tool = toolDict[invocation.slug];
            if (!tool) throw new Error(`tool not found: ${invocation.slug}`);

            // execute returns BrainPlugToolExecution directly (already wrapped)
            return tool.execute({ invocation: invocation as any }, {});
          }),
        );

        expect(executions).toHaveLength(2);
        expect(executions.map((e) => e.slug).sort()).toEqual([
          'get-invoices',
          'get-subscriptions',
        ]);

        // step 3: continue with all executions
        const result2 = await mockAtom.ask({
          role: {},
          prompt: executions,
          on: { episode: result1.episode },
          schema: { output: z.object({ analysis: z.string() }) },
          plugs: { tools },
        });

        expect(result2.output?.analysis).toContain('2 invoices');
        expect(result2.output?.analysis).toContain('1 subscriptions');
      });
    });
  });

  given('[case3] BrainRepl handles tool execution errors', () => {
    type SearchInput = { query: string };
    type SearchOutput = { results: string[] };

    const searchTool = genBrainPlugToolDeclaration({
      slug: 'search',
      name: 'Search',
      description: 'search for things',
      schema: {
        input: z.object({ query: z.string() }),
        output: z.object({ results: z.array(z.string()) }),
      },
      execute: async ({ invocation }) => {
        if (invocation.input.query === 'fail:constraint') {
          throw new Error('no results found');
        }
        if (invocation.input.query === 'fail:malfunction') {
          throw new Error('ECONNREFUSED');
        }
        return { results: ['result1', 'result2'] };
      },
    });

    when('[t0] tool throws error', () => {
      then('genBrainPlugToolDeclaration wraps error with signal', async () => {
        const invocation = new BrainPlugToolInvocation<SearchInput>({
          exid: 'search-1',
          slug: 'search',
          input: { query: 'fail:constraint' },
        });

        // genBrainPlugToolDeclaration catches errors and wraps them
        // errors become error:malfunction by default (or error:constraint if BadRequestError)
        const execution = await searchTool.execute({ invocation }, {});

        expect(execution.signal).toEqual('error:malfunction');
        expect(execution.output).toEqual({
          error: new Error('no results found'),
        });
        expect(execution.metrics.cost.time).toBeDefined();
      });
    });

    when('[t1] tool succeeds', () => {
      then(
        'genBrainPlugToolDeclaration wraps with success signal',
        async () => {
          const invocation = new BrainPlugToolInvocation<SearchInput>({
            exid: 'search-2',
            slug: 'search',
            input: { query: 'valid query' },
          });

          const execution = await searchTool.execute({ invocation }, {});

          expect(execution.signal).toEqual('success');
          expect(execution.output).toEqual({ results: ['result1', 'result2'] });
          expect(execution.exid).toEqual('search-2');
          expect(execution.slug).toEqual('search');
        },
      );
    });
  });

  given('[case4] type safety via schema validation', () => {
    type CalcInput = { a: number; b: number; op: 'add' | 'mul' };
    type CalcOutput = { result: number };

    const calcTool = genBrainPlugToolDeclaration({
      slug: 'calc',
      name: 'Calculator',
      description: 'perform calculation',
      schema: {
        input: z.object({
          a: z.number(),
          b: z.number(),
          op: z.enum(['add', 'mul']),
        }),
        output: z.object({ result: z.number() }),
      },
      execute: async ({ invocation }) => {
        const { a, b, op } = invocation.input;
        return { result: op === 'add' ? a + b : a * b };
      },
    });

    when('[t0] repl validates invocation input via schema', () => {
      then('invalid input is caught', () => {
        const badInvocation = {
          exid: 'calc-1',
          slug: 'calc',
          input: { a: 'not a number', b: 2, op: 'add' },
        };

        // validate input before execution
        const parseResult = calcTool.schema.input.safeParse(
          badInvocation.input,
        );

        expect(parseResult.success).toBe(false);
      });
    });

    when('[t1] repl validates execution output via schema', () => {
      then('valid output passes schema', async () => {
        const invocation = new BrainPlugToolInvocation<CalcInput>({
          exid: 'calc-2',
          slug: 'calc',
          input: { a: 5, b: 3, op: 'mul' },
        });

        // execute returns BrainPlugToolExecution
        const execution = await calcTool.execute({ invocation }, {});

        // validate output via schema
        const parseResult = calcTool.schema.output.safeParse(execution.output);

        expect(parseResult.success).toBe(true);
        expect(parseResult.data).toEqual({ result: 15 });
        expect(execution.signal).toEqual('success');
      });
    });
  });

  given('[case5] full agentic loop pattern (what BrainRepl.act does)', () => {
    /**
     * .what = demonstrates the full loop pattern a real BrainRepl supplier uses
     * .why = proves the contracts support multi-turn tool coordination
     */

    type ReadFileInput = { path: string };
    type ReadFileOutput = { content: string };

    type WriteFileInput = { path: string; content: string };
    type WriteFileOutput = { written: boolean };

    type RunTestsInput = Record<string, never>;
    type RunTestsOutput = { passed: boolean; output: string };

    // simulated file system state
    const fileSystem: Record<string, string> = {
      'src/hello.ts': 'export const hello = () => "hello";',
    };

    const readFileTool = genBrainPlugToolDeclaration({
      slug: 'read-file',
      name: 'Read File',
      description: 'read contents of a file',
      schema: {
        input: z.object({ path: z.string() }),
        output: z.object({ content: z.string() }),
      },
      execute: async ({ invocation }) => {
        const content = fileSystem[invocation.input.path];
        if (!content)
          throw new Error(`file not found: ${invocation.input.path}`);
        return { content };
      },
    });

    const writeFileTool = genBrainPlugToolDeclaration({
      slug: 'write-file',
      name: 'Write File',
      description: 'write contents to a file',
      schema: {
        input: z.object({ path: z.string(), content: z.string() }),
        output: z.object({ written: z.boolean() }),
      },
      execute: async ({ invocation }) => {
        fileSystem[invocation.input.path] = invocation.input.content;
        return { written: true };
      },
    });

    const runTestsTool = genBrainPlugToolDeclaration({
      slug: 'run-tests',
      name: 'Run Tests',
      description: 'run the test suite',
      schema: {
        input: z.object({}),
        output: z.object({ passed: z.boolean(), output: z.string() }),
      },
      execute: async () => {
        // simulate: tests pass if hello.ts contains "world"
        const content = fileSystem['src/hello.ts'] ?? '';
        const passed = content.includes('world');
        return { passed, output: passed ? 'all tests pass' : 'test failed' };
      },
    });

    // mock atom that simulates multi-turn flow:
    // turn 1: read file
    // turn 2: write updated file
    // turn 3: run tests
    // turn 4: return final output
    let turnCount = 0;

    const mockAtom = new BrainAtom({
      repo: 'test',
      slug: 'mock-atom-agentic',
      description: 'mock atom for agentic loop test',
      spec,
      ask: async (input): Promise<BrainOutput<any, 'atom', any>> => {
        turnCount++;

        // handle tool execution results
        if (Array.isArray(input.prompt)) {
          const execution = input.prompt[0]!;

          // after read file, write updated version
          if (execution.slug === 'read-file') {
            return new BrainOutput({
              output: null,
              calls: {
                tools: [
                  new BrainPlugToolInvocation<WriteFileInput>({
                    exid: `write-${turnCount}`,
                    slug: 'write-file',
                    input: {
                      path: 'src/hello.ts',
                      content: 'export const hello = () => "hello world";',
                    },
                  }),
                ],
              },
              metrics: genMockedBrainOutputMetrics(),
              episode: await createEpisode(
                'read result',
                'tool_use:write-file',
              ),
              series: null,
            });
          }

          // after write file, run tests
          if (execution.slug === 'write-file') {
            return new BrainOutput({
              output: null,
              calls: {
                tools: [
                  new BrainPlugToolInvocation<RunTestsInput>({
                    exid: `tests-${turnCount}`,
                    slug: 'run-tests',
                    input: {},
                  }),
                ],
              },
              metrics: genMockedBrainOutputMetrics(),
              episode: await createEpisode(
                'write result',
                'tool_use:run-tests',
              ),
              series: null,
            });
          }

          // after tests pass, return final output
          if (execution.slug === 'run-tests') {
            const testResult = execution.output as RunTestsOutput;
            return new BrainOutput({
              output: {
                complete: testResult.passed,
                summary: `refactored hello.ts, tests ${testResult.passed ? 'pass' : 'fail'}`,
              },
              calls: null,
              metrics: genMockedBrainOutputMetrics(),
              episode: await createEpisode('test result', 'done'),
              series: null,
            });
          }
        }

        // initial prompt: start by read the file
        if (typeof input.prompt === 'string') {
          return new BrainOutput({
            output: null,
            calls: {
              tools: [
                new BrainPlugToolInvocation<ReadFileInput>({
                  exid: `read-${turnCount}`,
                  slug: 'read-file',
                  input: { path: 'src/hello.ts' },
                }),
              ],
            },
            metrics: genMockedBrainOutputMetrics(),
            episode: await createEpisode(input.prompt, 'tool_use:read-file'),
            series: null,
          });
        }

        throw new Error('unexpected prompt type');
      },
    });

    when('[t0] repl executes full agentic loop until completion', () => {
      then(
        'loop coordinates multiple tool calls until final output',
        async () => {
          // reset state
          turnCount = 0;
          fileSystem['src/hello.ts'] = 'export const hello = () => "hello";';

          const tools = [readFileTool, writeFileTool, runTestsTool];

          // this is what BrainRepl.act() does internally
          let prompt: string | BrainPlugToolExecution[] =
            'refactor hello.ts to return "hello world"';
          let episode: Awaited<ReturnType<typeof createEpisode>> | undefined;
          let loopCount = 0;
          const maxLoops = 10;

          while (loopCount < maxLoops) {
            loopCount++;

            // ask the atom
            const result = await mockAtom.ask({
              role: {},
              prompt,
              on: episode ? { episode } : undefined,
              schema: {
                output: z.object({
                  complete: z.boolean(),
                  summary: z.string(),
                }),
              },
              plugs: { tools },
            });

            // if no tool calls, we're done
            if (result.calls === null) {
              expect(result.output).toEqual({
                complete: true,
                summary: 'refactored hello.ts, tests pass',
              });
              break;
            }

            // execute all tool calls
            // note: genBrainPlugToolDeclaration wraps execute to return BrainPlugToolExecution
            const toolDict = asBrainPlugToolDict(tools);
            const executions: BrainPlugToolExecution[] = await Promise.all(
              result.calls.tools.map(
                async (invocation: BrainPlugToolInvocation) => {
                  const tool = toolDict[invocation.slug];
                  if (!tool)
                    throw new Error(`tool not found: ${invocation.slug}`);

                  // execute returns BrainPlugToolExecution directly (already wrapped)
                  return tool.execute({ invocation: invocation as any }, {});
                },
              ),
            );

            // continue with executions
            prompt = executions;
            episode = result.episode;
          }

          // verify the loop completed
          expect(loopCount).toBeLessThan(maxLoops);
          expect(loopCount).toEqual(4); // initial + read + write + tests

          // verify file was updated
          expect(fileSystem['src/hello.ts']).toContain('hello world');
        },
      );
    });

    when('[t1] snapshot the agentic loop', () => {
      then('multi-turn coordination is captured', async () => {
        // reset state
        turnCount = 0;
        fileSystem['src/hello.ts'] = 'export const hello = () => "hello";';

        const tools = [readFileTool, writeFileTool, runTestsTool];
        const trace: { turn: number; action: string; slug?: string }[] = [];

        let prompt: string | BrainPlugToolExecution[] = 'refactor hello.ts';
        let episode: Awaited<ReturnType<typeof createEpisode>> | undefined;
        let finalOutput: unknown;

        for (let i = 0; i < 10; i++) {
          const result = await mockAtom.ask({
            role: {},
            prompt,
            on: episode ? { episode } : undefined,
            schema: {
              output: z.object({ complete: z.boolean(), summary: z.string() }),
            },
            plugs: { tools },
          });

          if (result.calls === null) {
            trace.push({ turn: i + 1, action: 'complete' });
            finalOutput = result.output;
            break;
          }

          for (const inv of result.calls.tools) {
            trace.push({ turn: i + 1, action: 'tool_call', slug: inv.slug });
          }

          // execute returns BrainPlugToolExecution directly
          const toolDict = asBrainPlugToolDict(tools);
          const executions: BrainPlugToolExecution[] = await Promise.all(
            result.calls.tools.map(
              async (invocation: BrainPlugToolInvocation) => {
                const tool = toolDict[invocation.slug]!;
                return tool.execute({ invocation: invocation as any }, {});
              },
            ),
          );

          prompt = executions;
          episode = result.episode;
        }

        expect({ trace, finalOutput }).toMatchSnapshot();
      });
    });
  });
});
