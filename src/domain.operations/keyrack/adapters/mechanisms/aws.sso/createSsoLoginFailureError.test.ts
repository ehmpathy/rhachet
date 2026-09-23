import { MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { createSsoLoginFailureError } from './createSsoLoginFailureError';

describe('createSsoLoginFailureError', () => {
  given('[case1] no input', () => {
    when('[t0] the error is built', () => {
      const error = createSsoLoginFailureError();

      then('it is a MalfunctionError', () => {
        expect(error).toBeInstanceOf(MalfunctionError);
      });

      then('it names the failure', () => {
        expect(error.message).toContain('aws sso login failed');
      });

      then('it names the fix', () => {
        expect(error.message).toContain('check network connectivity');
      });
    });
  });

  /**
   * .what = the aws cli's exit code reaches a human on the RENDERED MESSAGE
   *
   * 🚨 .why the message and not `.metadata` = `helpful-errors` reserves `code`, and strips it
   *   in TWO separate calls — `omit(metadata, ['cause', 'code'])` in the constructor, before
   *   `fullMessage` is built, and `omit(raw, ['code'])` in the `.metadata` getter. so a call
   *   site that wrote `{ code }` reached NO reader on either channel, and a
   *   `.rejects.toThrow()` assertion cannot see that — which is why it survived
   *
   * ⚠️ .note = DOGFOOD, and read the BOUND: this clamp bites the factory's own render —
   *   change `exitCode` to `code` in `createSsoLoginFailureError.ts` and it reddens. it does
   *   NOT bite a call site, and it does not have to: the input is a CLOSED shape, so a call
   *   site that writes `{ code }` is a TYPE ERROR (`npm run test:types`), never a silent drop
   */
  given('[case2] an exitCode', () => {
    when('[t0] the error is built', () => {
      const error = createSsoLoginFailureError({ exitCode: 42 });

      then('the RENDERED MESSAGE carries the exit code', () => {
        expect(error.message).toContain('exitCode');
        expect(error.message).toContain('42');
      });

      then('the `.metadata` getter carries it too', () => {
        expect(error.metadata).toMatchObject({ exitCode: 42 });
      });
    });
  });

  /**
   * ⚠️ .note = the NEGATIVE half — that the library silently eats a number written under
   *   `code` — is clamped once, purely, at `withSsoTimeout.test.ts` ([case] the same number
   *   under the reserved `code` key). it is not restated here: this factory's closed input
   *   makes that key unwritable, so there is no path left to assert against
   */
  // .why null = `child.on('close', (code) => …)` hands over `number | null`
  given('[case3] a null exitCode', () => {
    when('[t0] the error is built', () => {
      const error = createSsoLoginFailureError({ exitCode: null });

      then('it still renders, and names no bogus code', () => {
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain('aws sso login failed');
      });
    });
  });
});
