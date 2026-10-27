import { UnexpectedCodePathError } from 'helpful-errors';

import { ContextOpenAI } from '@src/domain.operations/stitch/adapters/imagineViaOpenAI';

/**
 * .what = the openai context the stitch integration tests imagine through
 * .why = a test of the stitch flow needs a real, live model, not a particular one
 * .note = the model is the `gpt-4o-mini` alias, not a dated snapshot. openai retired the prior
 *   pin, `gpt-4-turbo-2024-04-09`, so every call to it failed and the `enweaveOne*` suites went
 *   red with no code change. the suites assert the flow's shape, never a model's exact words (the
 *   `enweaveOneStitcher` snapshots omit each `input` and `output`), so no snapshot moved, and an
 *   alias outlives any one dated pin
 */
export const getContextOpenAI = (): ContextOpenAI => ({
  openai: {
    auth: {
      key:
        process.env.OPENAI_API_KEY ??
        UnexpectedCodePathError.throw('prep openai key not declared in env'),
    },
    llm: {
      model: 'gpt-4o-mini',
      output: 'words',
    },
  },
});
