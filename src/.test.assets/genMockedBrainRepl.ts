import { BrainOutput } from '@src/domain.objects/BrainOutput';
import { BrainRepl } from '@src/domain.objects/BrainRepl';

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
    ask: async (askInput) =>
      new BrainOutput({
        output: askInput.schema.output.parse({
          content: input?.content ?? '__mock_response__',
        }),
        metrics: genMockedBrainOutputMetrics(),
      }),
    act: async (actInput) =>
      new BrainOutput({
        output: actInput.schema.output.parse({
          content: input?.content ?? '__mock_response__',
        }),
        metrics: genMockedBrainOutputMetrics(),
      }),
  });
