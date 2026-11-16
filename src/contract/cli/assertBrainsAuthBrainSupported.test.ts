import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { assertBrainsAuthBrainSupported } from './assertBrainsAuthBrainSupported';

describe('assertBrainsAuthBrainSupported', () => {
  given('[case1] the claude brain', () => {
    when('[t0] the brain is checked for support', () => {
      then('it passes', () => {
        expect(() =>
          assertBrainsAuthBrainSupported({ brain: 'claude', verb: 'get' }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] a brain with no adapter', () => {
    when('[t0] the brain is checked for support', () => {
      then('it refuses, and the hint names the verb', async () => {
        const error = await getError(async () =>
          assertBrainsAuthBrainSupported({ brain: 'codex', verb: 'use' }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('no auth adapter for this brain');
        expect(error.message).toContain('rhx brains auth use --brain claude');
      });
    });
  });
});
