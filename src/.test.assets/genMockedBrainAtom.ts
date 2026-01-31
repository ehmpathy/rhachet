import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { BrainOutput } from '@src/domain.objects/BrainOutput';
import { genBrainContinuables } from '@src/domain.operations/brainContinuation/genBrainContinuables';

import { genMockedBrainOutputMetrics } from './genMockedBrainOutputMetrics';
import { genSampleBrainSpec } from './genSampleBrainSpec';

/**
 * .what = generates a mocked BrainAtom for tests
 * .why = reduces boilerplate in tests and ensures consistent mock behavior
 */
export const genMockedBrainAtom = (input?: {
  repo?: string;
  slug?: string;
  description?: string;
  content?: string;
}): BrainAtom =>
  new BrainAtom({
    repo: input?.repo ?? '__mock_repo__',
    slug: input?.slug ?? '__mock_atom__',
    description: input?.description ?? 'mocked brain atom for tests',
    spec: genSampleBrainSpec(),
    ask: async (askInput) => {
      const outputParsed = askInput.schema.output.parse({
        content: input?.content ?? '__mock_response__',
      });
      const { episode } = await genBrainContinuables({
        for: { grain: 'atom' },
        on: { episode: askInput.on?.episode ?? null },
        with: {
          exchange: {
            input: askInput.prompt,
            output: JSON.stringify(outputParsed),
            exid: null,
          },
        },
      });
      return new BrainOutput<typeof outputParsed, 'atom'>({
        output: outputParsed,
        metrics: genMockedBrainOutputMetrics(),
        episode,
        series: null,
      });
    },
  });
