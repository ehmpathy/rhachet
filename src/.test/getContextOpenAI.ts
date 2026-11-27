import { ConstraintError } from 'helpful-errors';

import { ContextOpenAI } from '@src/domain.operations/stitch/adapters/imagineViaOpenAI';

/**
 * .what = the openai context a test runs against
 * .why = one place reads the key, and fails fast with the fix when it is absent
 */
export const getContextOpenAI = (): ContextOpenAI => ({
  openai: {
    auth: {
      key:
        process.env.OPENAI_API_KEY ??
        ConstraintError.throw('prep openai key not declared in env', {
          env: 'OPENAI_API_KEY',
          hint: 'run: rhx keyrack unlock --owner ehmpath --env test',
        }),
    },
    llm: {
      model: 'gpt-4o-mini-2024-07-18',
      output: 'words',
    },
  },
});
