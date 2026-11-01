import { UnexpectedCodePathError } from 'helpful-errors';

import { ContextOpenAI } from '@src/domain.operations/stitch/adapters/imagineViaOpenAI';

/**
 * .what = the openai context for a live imagine test
 * .why = one place declares the test model and reads the key
 * .note = the key is read on use, not at build: jest runs the body of a skipped describe to
 *   register its tests, so an eager read would throw in a tier-3 suite the gate skipped
 */
export const getContextOpenAI = (): ContextOpenAI => ({
  openai: {
    auth: {
      get key(): string {
        return (
          process.env.OPENAI_API_KEY ??
          UnexpectedCodePathError.throw('prep openai key not declared in env')
        );
      },
    },
    llm: {
      model: 'gpt-4-turbo-2024-04-09',
      output: 'words',
    },
  },
});
