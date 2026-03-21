import { BrainAtom } from '@src/domain.objects/BrainAtom';
import {
  AsBrainOutputCallsFor,
  BrainOutput,
} from '@src/domain.objects/BrainOutput';
import type { BrainPlugs } from '@src/domain.objects/BrainPlugs';
import type { BrainPlugToolInvocation } from '@src/domain.objects/BrainPlugToolInvocation';
import { genBrainContinuables } from '@src/domain.operations/brainContinuation/genBrainContinuables';

import { genMockedBrainOutputMetrics } from './genMockedBrainOutputMetrics';
import { genSampleBrainSpec } from './genSampleBrainSpec';

/**
 * .what = generates a mocked BrainAtom for tests
 * .why = reduces boilerplate in tests and ensures consistent mock behavior
 *
 * .note = use `calls` to simulate tool invocations for tool execution tests
 * .note = use `onAsk` to capture input for verification in tests
 */
export const genMockedBrainAtom = (input?: {
  repo?: string;
  slug?: string;
  description?: string;
  content?: string;
  calls?: { tools: BrainPlugToolInvocation[] } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAsk?: (askInput: any) => void;
}): BrainAtom =>
  new BrainAtom({
    repo: input?.repo ?? '__mock_repo__',
    slug: input?.slug ?? '__mock_atom__',
    description: input?.description ?? 'mocked brain atom for tests',
    spec: genSampleBrainSpec(),
    ask: async (askInput) => {
      input?.onAsk?.(askInput);
      const outputParsed = askInput.schema.output.parse({
        content: input?.content ?? '__mock_response__',
      });

      // prompt can be string or BrainPlugToolExecution[] when tools are plugged
      const promptAsString =
        typeof askInput.prompt === 'string'
          ? askInput.prompt
          : JSON.stringify(askInput.prompt);

      const { episode } = await genBrainContinuables({
        for: { grain: 'atom' },
        on: { episode: askInput.on?.episode ?? null },
        with: {
          exchange: {
            input: promptAsString,
            output: JSON.stringify(outputParsed),
            exid: null,
          },
        },
      });
      // determine calls based on input configuration
      const calls = (input?.calls ?? null) as AsBrainOutputCallsFor<
        BrainPlugs,
        'atom'
      >;

      return new BrainOutput<typeof outputParsed, 'atom', BrainPlugs>({
        output: outputParsed,
        calls,
        metrics: genMockedBrainOutputMetrics(),
        episode,
        series: null,
      });
    },
  });
