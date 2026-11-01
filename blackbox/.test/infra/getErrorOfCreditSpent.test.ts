import { ConstraintError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { getErrorOfCreditSpent } from './getErrorOfCreditSpent';

const SCREEN_CREDIT_SPENT =
  'API Error: 400 {"type":"error","error":{"message":"Your credit balance is too low to access the Anthropic API."}}';

describe('getErrorOfCreditSpent', () => {
  given('[case1] a screen that names a spent credit', () => {
    when('[t0] the say poll never saw a reply', () => {
      // .note = useBeforeAll hands back a proxy over a Record, so the error rides a field
      const result = useBeforeAll(async () => ({
        error: getErrorOfCreditSpent({
          text: SCREEN_CREDIT_SPENT,
          phase: 'replied',
          address: '@:abc12345',
          cause: null,
        }),
      }));

      then('it is a ConstraintError', () => {
        expect(result.error).toBeInstanceOf(ConstraintError);
      });

      then('it names the cause', () => {
        expect(result.error!.message).toContain(
          'the anthropic api credit is spent, so the brain never replied',
        );
      });

      then('it names the clone', () => {
        expect(result.error!.message).toContain('@:abc12345');
      });

      then('it names what it stops', () => {
        expect(result.error!.message).toContain(
          '"stops": "every test that bills the api key',
        );
      });

      then('it names what it leaves green', () => {
        expect(result.error!.message).toContain(
          '"unaffected": "every test that bills no key',
        );
      });

      then('it names who decides', () => {
        expect(result.error!.message).toContain(
          'ask whoever funds the ehmpath test ANTHROPIC_API_KEY',
        );
        expect(result.error!.message).toMatchSnapshot();
      });
    });

    when('[t1] a readiness wait timed out', () => {
      const timeout = new Error('timed out on the ready banner');
      const result = useBeforeAll(async () => ({
        error: getErrorOfCreditSpent({
          text: SCREEN_CREDIT_SPENT,
          phase: 'got ready',
          address: null,
          cause: timeout,
        }),
      }));

      then('it names the readiness phase', () => {
        expect(result.error!.message).toContain('so the brain never got ready');
      });

      then('it keeps the timeout as its cause', () => {
        expect(result.error!.cause).toBe(timeout);
      });

      then('it omits the address row, since no clone was named', () => {
        expect(result.error!.message).not.toContain('"address"');
      });

      then('the readiness variant renders as snapped', () => {
        expect(result.error!.message).toMatchSnapshot();
      });
    });
  });

  given('[case2] a screen that names no spent credit', () => {
    when('[t0] the poll or wait failed for another cause', () => {
      then('it returns null, so the original failure stands', () => {
        expect(
          getErrorOfCreditSpent({
            text: '⏺ still at work',
            phase: 'replied',
            address: '@:abc12345',
            cause: null,
          }),
        ).toEqual(null);
      });
    });
  });
});
