import { UnexpectedCodePathError } from 'helpful-errors';

import { ContextOpenAI } from '@src/domain.operations/stitch/adapters/imagineViaOpenAI';

export const getContextOpenAI = (): ContextOpenAI => ({
  openai: {
    auth: {
      key:
        process.env.OPENAI_API_KEY ??
        UnexpectedCodePathError.throw('prep openai key not declared in env'),
    },
    llm: {
      model: 'gpt-4-turbo-2024-04-09',
      output: 'words',
    },
  },
});
