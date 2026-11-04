import { ConstraintError } from 'helpful-errors';

import { BrainAtom } from '@src/domain.objects/BrainAtom';
import {
  AsBrainOutputCallsFor,
  BrainOutput,
} from '@src/domain.objects/BrainOutput';
import type { BrainPlugs } from '@src/domain.objects/BrainPlugs';
import type { BrainPlugToolInvocation } from '@src/domain.objects/BrainPlugToolInvocation';
import { genBrainContinuables } from '@src/domain.operations/brainContinuation/genBrainContinuables';

import { asMockedBrainCall, type MockedBrainCall } from './asMockedBrainCall';
import { asMockedBrainOutput } from './asMockedBrainOutput';
import { genMockedBrainOutputMetrics } from './genMockedBrainOutputMetrics';
import { genSampleBrainSpec } from './genSampleBrainSpec';

/**
 * .what = generates a mocked BrainAtom for tests
 * .why = reduces boilerplate in tests and ensures consistent mock behavior; no key, no api cost
 * .real = the real brain is proven only by the blackbox smoketests, as for `genMockedBrainRepl`
 *
 * .note = use `calls` to simulate tool invocations for tool execution tests
 * .note = `output.ask` is what the atom answers, parsed by the caller's schema; an `output` told
 *   with no `ask` fails loud. with no `output` at all, it answers `{ content }`; told both
 *   `content` and `output`, it refuses at construction
 * .note = `onInvoke` records each call (prompt, brief uris), as `genMockedBrainRepl` does
 */
export const genMockedBrainAtom = (input?: {
  repo?: string;
  slug?: string;
  description?: string;
  content?: string;
  calls?: { tools: BrainPlugToolInvocation[] } | null;
  output?: { ask?: unknown };
  onInvoke?: (call: MockedBrainCall) => void;
}): BrainAtom => {
  // content is the answer only when no output is told; both at once would drop one in silence
  if (input?.content !== undefined && input?.output !== undefined)
    throw new ConstraintError('genMockedBrainAtom was told both content and output', {
      mock: 'genMockedBrainAtom',
      content: input.content,
      output: input.output,
      hint: 'give output alone; content answers only when no output is told',
    });

  return new BrainAtom({
    repo: input?.repo ?? '__mock_repo__',
    slug: input?.slug ?? '__mock_atom__',
    description: input?.description ?? 'mocked brain atom for tests',
    spec: genSampleBrainSpec(),
    ask: async (askInput, _context?) => {
      // record what the atom was handed, before the parse, so a refused call is still visible
      const callRecord = asMockedBrainCall({
        verb: 'ask',
        prompt: askInput.prompt,
        briefs: askInput.role?.briefs,
      });
      input?.onInvoke?.(callRecord);

      // an output told with no ask is a test setup slip: fail loud
      const outputVerbsTold = Object.keys(input?.output ?? {});
      if (input?.output && input.output.ask === undefined)
        throw new ConstraintError(
          outputVerbsTold.length
            ? "genMockedBrainAtom was told an output, but none for 'ask'"
            : "genMockedBrainAtom was told an empty output, so none for 'ask'",
          {
            mock: 'genMockedBrainAtom',
            verb: 'ask',
            outputVerbsTold,
            hint: "add output.ask, in the shape the caller's schema wants",
          },
        );

      // parse the told output (or the { content } default) by the caller's schema
      const outputDefault = { content: input?.content ?? '__mock_response__' };
      const outputParsed = asMockedBrainOutput({
        mock: 'genMockedBrainAtom',
        verb: 'ask',
        schema: askInput.schema.output,
        output: input?.output ? input.output.ask : outputDefault,
      });

      const { episode } = await genBrainContinuables({
        for: { grain: 'atom' },
        on: { episode: askInput.on?.episode ?? null },
        with: {
          exchange: {
            input: callRecord.prompt,
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
};
