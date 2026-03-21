import { BrainOutput } from '@src/domain.objects/BrainOutput';
import { BrainRepl } from '@src/domain.objects/BrainRepl';
import { genBrainContinuables } from '@src/domain.operations/brainContinuation/genBrainContinuables';

import { genMockedBrainOutputMetrics } from './genMockedBrainOutputMetrics';
import { genSampleBrainSpec } from './genSampleBrainSpec';

/**
 * .what = generates a mocked BrainRepl for tests
 * .why = reduces boilerplate in tests and ensures consistent mock behavior
 *
 * .note = repls always return calls: null (they execute tools internally via tool.execute())
 * .note = prompt can be string or BrainPlugToolExecution[] for tool result continuation
 */
export const genMockedBrainRepl = (input?: {
  repo?: string;
  slug?: string;
  description?: string;
  content?: string;
}): BrainRepl =>
  new BrainRepl({
    repo: input?.repo ?? '__mock_repo__',
    slug: input?.slug ?? '__mock_repl__',
    description: input?.description ?? 'mocked brain repl for tests',
    spec: genSampleBrainSpec(),
    ask: async (askInput, _context?) => {
      const outputParsed = askInput.schema.output.parse({
        content: input?.content ?? '__mock_response__',
      });
      // prompt can be string or BrainPlugToolExecution[] when tools are plugged
      const promptAsString =
        typeof askInput.prompt === 'string'
          ? askInput.prompt
          : JSON.stringify(askInput.prompt);

      const { episode, series } = await genBrainContinuables({
        for: { grain: 'repl' },
        on: { episode: askInput.on?.episode, series: askInput.on?.series },
        with: {
          exchange: {
            input: promptAsString,
            output: JSON.stringify(outputParsed),
            exid: null,
          },
        },
      });
      return new BrainOutput<typeof outputParsed, 'repl'>({
        output: outputParsed,
        calls: null,
        metrics: genMockedBrainOutputMetrics(),
        episode,
        series,
      });
    },
    act: async (actInput, _context?) => {
      const outputParsed = actInput.schema.output.parse({
        content: input?.content ?? '__mock_response__',
      });
      // prompt can be string or BrainPlugToolExecution[] when tools are plugged
      const promptAsString =
        typeof actInput.prompt === 'string'
          ? actInput.prompt
          : JSON.stringify(actInput.prompt);

      const { episode, series } = await genBrainContinuables({
        for: { grain: 'repl' },
        on: { episode: actInput.on?.episode, series: actInput.on?.series },
        with: {
          exchange: {
            input: promptAsString,
            output: JSON.stringify(outputParsed),
            exid: null,
          },
        },
      });
      return new BrainOutput<typeof outputParsed, 'repl'>({
        output: outputParsed,
        calls: null,
        metrics: genMockedBrainOutputMetrics(),
        episode,
        series,
      });
    },
  });
