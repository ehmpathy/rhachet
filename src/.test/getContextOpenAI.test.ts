import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { getContextOpenAI } from './getContextOpenAI';

describe('getContextOpenAI', () => {
  given('[case1] an env with no OPENAI_API_KEY', () => {
    const keyBefore = process.env.OPENAI_API_KEY;
    beforeAll(() => {
      delete process.env.OPENAI_API_KEY;
    });
    afterAll(() => {
      if (keyBefore !== undefined) process.env.OPENAI_API_KEY = keyBefore;
    });

    when('[t0] the context is built, as a skipped tier-3 suite does', () => {
      then('it builds with no throw', () => {
        expect(() => getContextOpenAI()).not.toThrow();
      });
    });

    when('[t1] the key is read, as a live call does', () => {
      then('it fails loud and names the absent key', async () => {
        const error = await getError(async () => getContextOpenAI().openai.auth.key);
        expect(error.message).toContain('prep openai key not declared in env');
      });
    });
  });
});
