import { UnexpectedCodePathError } from 'helpful-errors';

import { ContextOpenAI } from '../logic/stitch/adapters/imagineViaOpenAI';

export const getContextOpenAI = (): ContextOpenAI => ({
  openai: {
    auth: {
      key:
        process.env.PREP_OPENAI_KEY ??
        UnexpectedCodePathError.throw('prep openai key not declared in env'),
    },
    llm: {
      model: 'gpt-4-turbo-2024-04-09',
      output: 'words',
    },
  },
});
