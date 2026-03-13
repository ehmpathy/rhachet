/**
 * .what = playtest for BrainAtom tool continuation
 * .why = proves the contracts are ergonomic via direct instantiation
 */
import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { genMockedBrainEpisode } from '@src/.test.assets/genMockedBrainEpisode';
import { genMockedBrainOutputMetrics } from '@src/.test.assets/genMockedBrainOutputMetrics';
import { genSampleBrainSpec } from '@src/.test.assets/genSampleBrainSpec';
import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { BrainOutput } from '@src/domain.objects/BrainOutput';
import type { BrainPlugToolDefinition } from '@src/domain.objects/BrainPlugToolDefinition';
import type { BrainPlugToolExecution } from '@src/domain.objects/BrainPlugToolExecution';
import { BrainPlugToolInvocation } from '@src/domain.objects/BrainPlugToolInvocation';

import { genBrainExchange } from './genBrainExchange';

describe('brainAtom.tool.continuation', () => {
  // shared spec for all test atoms
  const spec = genSampleBrainSpec();

  // shared episode factory via SDK utils
  const createEpisode = async (input: string, output: string) =>
    genMockedBrainEpisode({
      exchange: await genBrainExchange({
        with: { input, output, exid: null },
      }),
    });

  given('[case1] calculator brain with tool use', () => {
    // typed tool input and output
    type CalcInput = { operation: string; a: number; b: number };
    type CalcOutput = { result: number };

    const calculatorTool: BrainPlugToolDefinition<CalcInput, CalcOutput> = {
      slug: 'calculator',
      name: 'Calculator',
      description: 'perform math operations',
      schema: {
        input: z.object({
          operation: z.enum(['add', 'multiply', 'subtract']),
          a: z.number(),
          b: z.number(),
        }),
        output: z.object({ result: z.number() }),
      },
    };

    // calculator brain: returns tool call for math, uses result to answer
    const calculatorAtom = new BrainAtom({
      repo: 'test',
      slug: 'calculator-brain',
      description: 'a brain that uses calculator tool',
      spec,
      ask: async (input): Promise<BrainOutput<any, 'atom', any>> => {
        // continuation: tool executions passed back
        if (Array.isArray(input.prompt)) {
          const answers = input.prompt.map((e) => {
            const { input: inp, output: out } = z
              .object(calculatorTool.schema)
              .parse(e);
            return `${inp.a} ${inp.operation} ${inp.b} = ${out.result}`;
          });
          return new BrainOutput({
            output: { answer: answers.join('; ') },
            calls: null,
            metrics: genMockedBrainOutputMetrics(),
            episode: await createEpisode(
              JSON.stringify(input.prompt),
              answers.join('; '),
            ),
            series: null,
          });
        }

        // initial: parse prompt and return tool invocation
        if (typeof input.prompt !== 'string')
          throw new Error('expected string prompt');
        const prompt = input.prompt;
        const match = prompt.match(/(\w+)\s+(\d+)\s+and\s+(\d+)/i);
        if (!match) throw new Error('could not parse');

        const [, op, a, b] = match;
        const invocation = new BrainPlugToolInvocation<CalcInput>({
          exid: `calc-${Date.now()}`,
          slug: 'calculator',
          input: { operation: op!, a: Number(a), b: Number(b) },
        });

        return new BrainOutput({
          output: null,
          calls: { tools: [invocation] },
          metrics: genMockedBrainOutputMetrics(),
          episode: await createEpisode(prompt, 'tool_use:calculator'),
          series: null,
        });
      },
    });

    when('[t0] brain is asked to calculate', () => {
      then('brain returns tool invocation', async () => {
        const result = await calculatorAtom.ask({
          role: {},
          prompt: 'add 5 and 3',
          schema: { output: z.object({ answer: z.string() }) },
          plugs: { tools: [calculatorTool] },
        });

        expect(result.output).toBeNull();
        expect(result.calls?.tools).toHaveLength(1);
        expect(result.calls?.tools[0]?.slug).toEqual('calculator');
        expect(result.calls?.tools[0]?.input).toEqual({
          operation: 'add',
          a: 5,
          b: 3,
        });
      });
    });

    when('[t1] full round-trip: ask → tool call → execute → continue', () => {
      then('brain uses tool result to answer', async () => {
        // step 1: ask
        const result1 = await calculatorAtom.ask({
          role: {},
          prompt: 'multiply 7 and 6',
          schema: { output: z.object({ answer: z.string() }) },
          plugs: { tools: [calculatorTool] },
        });

        expect(result1.calls?.tools).toHaveLength(1);
        const invocation = result1.calls!.tools[0]!;

        // step 2: execute tool (input validated via schema, returns typed result)
        const { operation, a, b } = calculatorTool.schema.input.parse(
          invocation.input,
        );
        const calcResult =
          operation === 'multiply'
            ? a * b
            : operation === 'add'
              ? a + b
              : a - b;

        const execution: BrainPlugToolExecution<CalcInput, CalcOutput> = {
          exid: invocation.exid,
          slug: invocation.slug,
          input: invocation.input,
          signal: 'success',
          output: { result: calcResult },
          metrics: { cost: { time: { milliseconds: 5 } } },
        };

        // signal is 'success' so output is CalcOutput
        expect(execution.output).toEqual({ result: 42 });

        // step 3: continue with execution
        const result2 = await calculatorAtom.ask({
          role: {},
          prompt: [execution],
          on: { episode: result1.episode },
          schema: { output: z.object({ answer: z.string() }) },
          plugs: { tools: [calculatorTool] },
        });

        expect(result2.output?.answer).toContain('42');
        expect(result2.calls).toBeNull();
      });
    });

    when('[t2] snapshot the round-trip', () => {
      then('data shapes are captured', async () => {
        const result1 = await calculatorAtom.ask({
          role: {},
          prompt: 'subtract 100 and 42',
          schema: { output: z.object({ answer: z.string() }) },
          plugs: { tools: [calculatorTool] },
        });

        const invocation = result1.calls!.tools[0]!;
        const execution: BrainPlugToolExecution<CalcInput, CalcOutput> = {
          exid: invocation.exid,
          slug: invocation.slug,
          input: invocation.input,
          signal: 'success',
          output: { result: 100 - 42 },
          metrics: { cost: { time: { milliseconds: 5 } } },
        };

        const result2 = await calculatorAtom.ask({
          role: {},
          prompt: [execution],
          on: { episode: result1.episode },
          schema: { output: z.object({ answer: z.string() }) },
          plugs: { tools: [calculatorTool] },
        });

        expect({
          invocation: { slug: invocation.slug, input: invocation.input },
          execution: {
            slug: execution.slug,
            input: execution.input,
            output: execution.output,
            signal: execution.signal,
          },
          answer: result2.output?.answer,
        }).toMatchSnapshot();
      });
    });
  });

  given('[case2] weather brain with tool use', () => {
    // typed tool input and output
    type WeatherInput = { city: string };
    type WeatherOutput = { temperature: number; condition: string };

    const weatherTool: BrainPlugToolDefinition<WeatherInput, WeatherOutput> = {
      slug: 'get-weather',
      name: 'Get Weather',
      description: 'get current weather for a city',
      schema: {
        input: z.object({ city: z.string() }),
        output: z.object({ temperature: z.number(), condition: z.string() }),
      },
    };

    // weather brain: returns tool call for weather lookup
    const weatherAtom = new BrainAtom({
      repo: 'test',
      slug: 'weather-brain',
      description: 'a brain that uses weather tool',
      spec,
      ask: async (input): Promise<BrainOutput<any, 'atom', any>> => {
        if (Array.isArray(input.prompt)) {
          const forecasts = input.prompt.map((e) => {
            const { input: inp, output: out } = z
              .object(weatherTool.schema)
              .parse(e);
            return `${inp.city}: ${out.temperature}°F, ${out.condition}`;
          });
          return new BrainOutput({
            output: { forecast: forecasts.join(' | ') },
            calls: null,
            metrics: genMockedBrainOutputMetrics(),
            episode: await createEpisode(
              JSON.stringify(input.prompt),
              forecasts.join(' | '),
            ),
            series: null,
          });
        }

        if (typeof input.prompt !== 'string')
          throw new Error('expected string prompt');
        const prompt = input.prompt;
        const match = prompt.match(/weather\s+(?:in\s+)?(\w+)/i);
        if (!match) throw new Error('could not parse');

        const [, city] = match;
        return new BrainOutput({
          output: null,
          calls: {
            tools: [
              new BrainPlugToolInvocation<WeatherInput>({
                exid: `weather-${Date.now()}`,
                slug: 'get-weather',
                input: { city: city! },
              }),
            ],
          },
          metrics: genMockedBrainOutputMetrics(),
          episode: await createEpisode(prompt, 'tool_use:get-weather'),
          series: null,
        });
      },
    });

    when('[t0] full round-trip for weather', () => {
      then('brain uses weather data to answer', async () => {
        // step 1: ask
        const result1 = await weatherAtom.ask({
          role: {},
          prompt: 'weather in Austin',
          schema: { output: z.object({ forecast: z.string() }) },
          plugs: { tools: [weatherTool] },
        });

        expect(result1.calls?.tools[0]?.input).toEqual({ city: 'Austin' });

        // step 2: execute
        const invocation = result1.calls!.tools[0]!;
        const execution: BrainPlugToolExecution<WeatherInput, WeatherOutput> = {
          exid: invocation.exid,
          slug: invocation.slug,
          input: invocation.input,
          signal: 'success',
          output: { temperature: 85, condition: 'sunny' },
          metrics: { cost: { time: { milliseconds: 100 } } },
        };

        // step 3: continue
        const result2 = await weatherAtom.ask({
          role: {},
          prompt: [execution],
          on: { episode: result1.episode },
          schema: { output: z.object({ forecast: z.string() }) },
          plugs: { tools: [weatherTool] },
        });

        expect(result2.output?.forecast).toContain('Austin');
        expect(result2.output?.forecast).toContain('85');
        expect(result2.output?.forecast).toContain('sunny');
      });
    });

    when('[t1] snapshot the weather round-trip', () => {
      then('data shapes are captured', async () => {
        const result1 = await weatherAtom.ask({
          role: {},
          prompt: 'weather Seattle',
          schema: { output: z.object({ forecast: z.string() }) },
          plugs: { tools: [weatherTool] },
        });

        const invocation = result1.calls!.tools[0]!;
        const execution: BrainPlugToolExecution<WeatherInput, WeatherOutput> = {
          exid: invocation.exid,
          slug: invocation.slug,
          input: invocation.input,
          signal: 'success',
          output: { temperature: 55, condition: 'rainy' },
          metrics: { cost: { time: { milliseconds: 100 } } },
        };

        const result2 = await weatherAtom.ask({
          role: {},
          prompt: [execution],
          on: { episode: result1.episode },
          schema: { output: z.object({ forecast: z.string() }) },
          plugs: { tools: [weatherTool] },
        });

        expect({
          invocation: { slug: invocation.slug, input: invocation.input },
          execution: {
            slug: execution.slug,
            input: execution.input,
            output: execution.output,
            signal: execution.signal,
          },
          forecast: result2.output?.forecast,
        }).toMatchSnapshot();
      });
    });
  });

  given('[case3] error signals in tool execution', () => {
    type WeatherInput = { city: string };
    type WeatherOutput = { temperature: number; condition: string };

    when('[t0] constraint error', () => {
      then('execution captures signal', () => {
        const execution: BrainPlugToolExecution<WeatherInput, WeatherOutput> = {
          exid: 'err-1',
          slug: 'get-weather',
          input: { city: 'Atlantis' },
          signal: 'error:constraint',
          output: { error: new Error('city not found') },
          metrics: { cost: { time: { milliseconds: 50 } } },
        };

        expect(execution.signal).toEqual('error:constraint');
        expect(execution.output.error.message).toEqual('city not found');
      });
    });

    when('[t1] malfunction error', () => {
      then('execution captures signal', () => {
        const execution: BrainPlugToolExecution<WeatherInput, WeatherOutput> = {
          exid: 'err-2',
          slug: 'get-weather',
          input: { city: 'Austin' },
          signal: 'error:malfunction',
          output: { error: new Error('ECONNREFUSED') },
          metrics: { cost: { time: { milliseconds: 5000 } } },
        };

        expect(execution.signal).toEqual('error:malfunction');
        expect(execution.output.error.message).toEqual('ECONNREFUSED');
      });
    });
  });
});
