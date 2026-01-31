import { BrainOutput } from '@src/domain.objects/BrainOutput';
import { BrainRepl } from '@src/domain.objects/BrainRepl';
import { genBrainContinuables } from '@src/domain.operations/brainContinuation/genBrainContinuables';

import { genMockedBrainOutputMetrics } from './genMockedBrainOutputMetrics';
import { genSampleBrainSpec } from './genSampleBrainSpec';

/**
 * .what = generates a mocked BrainRepl for tests
 * .why = reduces boilerplate in tests and ensures consistent mock behavior
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
    ask: async (askInput) => {
      const outputParsed = askInput.schema.output.parse({
        content: input?.content ?? '__mock_response__',
      });
      const { episode, series } = await genBrainContinuables({
        for: { grain: 'repl' },
        on: { episode: askInput.on?.episode, series: askInput.on?.series },
        with: {
          exchange: {
            input: askInput.prompt,
            output: JSON.stringify(outputParsed),
            exid: null,
          },
        },
      });
      return new BrainOutput<typeof outputParsed, 'repl'>({
        output: outputParsed,
        metrics: genMockedBrainOutputMetrics(),
        episode,
        series,
      });
    },
    act: async (actInput) => {
      const outputParsed = actInput.schema.output.parse({
        content: input?.content ?? '__mock_response__',
      });
      const { episode, series } = await genBrainContinuables({
        for: { grain: 'repl' },
        on: { episode: actInput.on?.episode, series: actInput.on?.series },
        with: {
          exchange: {
            input: actInput.prompt,
            output: JSON.stringify(outputParsed),
            exid: null,
          },
        },
      });
      return new BrainOutput<typeof outputParsed, 'repl'>({
        output: outputParsed,
        metrics: genMockedBrainOutputMetrics(),
        episode,
        series,
      });
    },
  });
