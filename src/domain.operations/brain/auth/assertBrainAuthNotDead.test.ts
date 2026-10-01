import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genSampleBrainAuth } from '@src/.test/assets/genSampleBrainAuth';

import { assertBrainAuthNotDead } from './assertBrainAuthNotDead';

const brainAuthPath = '/home/fake/.claude/.credentials.json';

describe('assertBrainAuthNotDead', () => {
  given('[case1] the shared login is dead', () => {
    const brainAuthContent = genSampleBrainAuth({
      state: 'dead',
      expiresAt: 0,
    });

    when('[t0] no env credential is set', () => {
      then('it refuses with a ConstraintError that names /login', async () => {
        const error = await getError(() =>
          assertBrainAuthNotDead({ brainAuthPath, brainAuthContent, env: {} }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain("the box's claude login is dead");
        expect(error.message).toContain('/login');
        expect(error.message).toMatchSnapshot();
      });
    });

    when('[t1] CLAUDE_CODE_OAUTH_TOKEN is set', () => {
      then('it passes — the file is not the clone credential', () => {
        expect(() =>
          assertBrainAuthNotDead({
            brainAuthPath,
            brainAuthContent,
            env: { CLAUDE_CODE_OAUTH_TOKEN: 'x' },
          }),
        ).not.toThrow();
      });
    });

    when('[t2] ANTHROPIC_API_KEY is set', () => {
      then('it passes — the file is not the clone credential', () => {
        expect(() =>
          assertBrainAuthNotDead({
            brainAuthPath,
            brainAuthContent,
            env: { ANTHROPIC_API_KEY: 'x' },
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] the shared login is live', () => {
    const brainAuthContent = genSampleBrainAuth({
      state: 'live',
      expiresAt: 1,
    });
    when('[t0] no env credential is set', () => {
      then('it passes', () => {
        expect(() =>
          assertBrainAuthNotDead({ brainAuthPath, brainAuthContent, env: {} }),
        ).not.toThrow();
      });
    });
  });

  given('[case3] there is no shared login', () => {
    when('[t0] no env credential is set', () => {
      then('it passes — the clone can /login on its own', () => {
        expect(() =>
          assertBrainAuthNotDead({
            brainAuthPath,
            brainAuthContent: null,
            env: {},
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case4] the shared login does not parse', () => {
    when('[t0] no env credential is set', () => {
      then('it passes — claude-code judges it in the clone', () => {
        expect(() =>
          assertBrainAuthNotDead({
            brainAuthPath,
            brainAuthContent: 'not json',
            env: {},
          }),
        ).not.toThrow();
      });
    });
  });
});
