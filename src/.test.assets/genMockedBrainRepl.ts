import { ConstraintError } from 'helpful-errors';
import type { z } from 'zod';

import { BrainOutput } from '@src/domain.objects/BrainOutput';
import { BrainRepl } from '@src/domain.objects/BrainRepl';
import { genBrainContinuables } from '@src/domain.operations/brainContinuation/genBrainContinuables';

import { asMockedBrainCall, type MockedBrainCall } from './asMockedBrainCall';
import { asMockedBrainOutput } from './asMockedBrainOutput';
import { genMockedBrainOutputMetrics } from './genMockedBrainOutputMetrics';
import { genSampleBrainSpec } from './genSampleBrainSpec';

/**
 * .what = generates a mocked BrainRepl for tests
 * .why = lets a test drive the actor → brain call path with no real brain: no key, no api cost
 * .real = the real brain is proven only by the blackbox smoketests (`*.realbrain`,
 *   `replDoorRealSupplier.realnode`), on haiku
 *
 * .note = repls always return calls: null (they execute tools internally via tool.execute())
 * .note = `output.ask` / `output.act` is what that verb answers; the caller's schema parses it,
 *   so a shape the mock was not told to fill fails loud at parse. an `output` told with no entry
 *   for the asked verb fails loud too. with no `output` at all, it answers `{ content }`; told
 *   both `content` and `output`, it refuses at construction
 * .note = `onInvoke` records each call (verb, prompt, brief uris), so a test can prove what
 *   reached the brain, not only that a value came back
 */
export const genMockedBrainRepl = (input?: {
  repo?: string;
  slug?: string;
  description?: string;
  content?: string;
  output?: { ask?: unknown; act?: unknown };
  onInvoke?: (call: MockedBrainCall) => void;
}): BrainRepl => {
  // content is the answer only when no output is told; both at once would drop one in silence
  if (input?.content !== undefined && input?.output !== undefined)
    throw new ConstraintError('genMockedBrainRepl was told both content and output', {
      mock: 'genMockedBrainRepl',
      content: input.content,
      output: input.output,
      hint: 'give output alone; content answers only when no output is told',
    });

  // answer one call: record it, parse the told output by the caller's schema, continue the series
  const respond = async <TOutput>(respondInput: {
    verb: 'ask' | 'act';
    // pinned to the real ask contract; only the two generic-bound fields are widened here
    call: Omit<Parameters<BrainRepl['ask']>[0], 'schema' | 'prompt'> & {
      prompt: unknown;
      schema: { output: z.Schema<TOutput> };
    };
  }) => {
    // record what the brain was handed, before the parse, so a refused call is still visible
    const callRecord = asMockedBrainCall({
      verb: respondInput.verb,
      prompt: respondInput.call.prompt,
      briefs: respondInput.call.role.briefs,
    });
    input?.onInvoke?.(callRecord);

    // an output told for other verbs, or for none, but not this one, is a test setup slip: fail loud
    const outputForVerb = input?.output?.[respondInput.verb];
    const outputVerbsTold = Object.keys(input?.output ?? {});
    if (input?.output && outputForVerb === undefined)
      throw new ConstraintError(
        outputVerbsTold.length
          ? `genMockedBrainRepl was told an output, but none for '${respondInput.verb}'`
          : `genMockedBrainRepl was told an empty output, so none for '${respondInput.verb}'`,
        {
          mock: 'genMockedBrainRepl',
          verb: respondInput.verb,
          outputVerbsTold,
          hint: `add output.${respondInput.verb}, in the shape the caller's schema wants`,
        },
      );

    // parse the told output (or the { content } default) by the caller's schema
    const outputDefault = { content: input?.content ?? '__mock_response__' };
    const outputParsed = asMockedBrainOutput({
      mock: 'genMockedBrainRepl',
      verb: respondInput.verb,
      schema: respondInput.call.schema.output,
      output: input?.output ? outputForVerb : outputDefault,
    });

    const { episode, series } = await genBrainContinuables({
      for: { grain: 'repl' },
      on: {
        episode: respondInput.call.on?.episode,
        series: respondInput.call.on?.series,
      },
      with: {
        exchange: {
          input: callRecord.prompt,
          output: JSON.stringify(outputParsed),
          exid: null,
        },
      },
    });
    return new BrainOutput<TOutput, 'repl'>({
      output: outputParsed,
      calls: null,
      metrics: genMockedBrainOutputMetrics(),
      episode,
      series,
    });
  };

  return new BrainRepl({
    repo: input?.repo ?? '__mock_repo__',
    slug: input?.slug ?? '__mock_repl__',
    description: input?.description ?? 'mocked brain repl for tests',
    spec: genSampleBrainSpec(),
    ask: async (askInput, _context?) =>
      respond({ verb: 'ask', call: askInput }),
    act: async (actInput, _context?) =>
      respond({ verb: 'act', call: actInput }),
  });
};
