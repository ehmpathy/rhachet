import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { createSsoTimeoutError, isSsoTimeout } from './withSsoTimeout';

describe('withSsoTimeout', () => {
  given('isSsoTimeout', () => {
    when('[t0] output contains "timed out"', () => {
      then('returns true', () => {
        expect(isSsoTimeout('Connection timed out')).toBe(true);
        expect(isSsoTimeout('request timed out waiting')).toBe(true);
      });
    });

    when('[t1] output contains "authorization...expired"', () => {
      then('returns true', () => {
        expect(
          isSsoTimeout(
            'The pending authorization to retrieve an SSO token has expired.',
          ),
        ).toBe(true);
        expect(isSsoTimeout('authorization request expired')).toBe(true);
      });
    });

    when('[t2] output contains "authorization request"', () => {
      then('returns true', () => {
        expect(isSsoTimeout('authorization request failed')).toBe(true);
      });
    });

    when('[t3] output does not match timeout patterns', () => {
      then('returns false', () => {
        expect(isSsoTimeout('network error')).toBe(false);
        expect(isSsoTimeout('invalid credentials')).toBe(false);
        expect(isSsoTimeout('Successfully logged in')).toBe(false);
      });
    });
  });

  given('createSsoTimeoutError', () => {
    when('[t0] called without meta', () => {
      then('emits treestruct to stderr and returns ConstraintError', () => {
        // capture stderr
        const stderrChunks: string[] = [];
        const originalStderr = console.error;
        console.error = (msg: string) => stderrChunks.push(msg);

        try {
          const error = createSsoTimeoutError();

          // verify error type and content
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain(
            'aws sso login timed out: human did not respond to browser sso prompt',
          );
          expect(error.message).toContain('run: rhx keyrack unlock');

          // verify treestruct stderr output
          expect(stderrChunks.join('\n')).toMatchSnapshot();
        } finally {
          console.error = originalStderr;
        }
      });
    });

    when('[t1] called with meta', () => {
      then('includes meta in error', () => {
        const stderrChunks: string[] = [];
        const originalStderr = console.error;
        console.error = (msg: string) => stderrChunks.push(msg);

        try {
          const error = createSsoTimeoutError({
            profileName: 'test-profile',
            exitCode: 255,
          });

          expect(
            (error as unknown as { metadata: { profileName: string } }).metadata
              .profileName,
          ).toBe('test-profile');
          expect(
            (error as unknown as { metadata: { exitCode: number } }).metadata
              .exitCode,
          ).toBe(255);
        } finally {
          console.error = originalStderr;
        }
      });
    });

    /**
     * .what = the aws cli's exit code reaches a human on the RENDERED MESSAGE, under the name
     *   `exitCode`
     *
     * 🚨 .why the message and not `.metadata` = `helpful-errors` reserves `code`, and strips it in
     *   TWO separate calls — `omit(metadata, ['cause', 'code'])` in the constructor, before
     *   `fullMessage` is built, and `omit(raw, ['code'])` in the `.metadata` getter. so a metadata
     *   assertion alone passes while the message silently omits the field, and a future reserved-key
     *   addition could drop one strip without the other. the message is the channel a human reads,
     *   and `asCliErrorJson` projects the same `.metadata` a machine reads
     *
     * ⚠️ .note = DOGFOOD: rename `exitCode` back to `code` at either `setupAwsSsoProfile.ts` throw
     *   site (or here) and `[t2]` reddens — the number vanishes from the message entirely
     */
    when('[t2] called with an exit code', () => {
      then('the RENDERED MESSAGE carries it under `exitCode`', () => {
        const originalStderr = console.error;
        console.error = () => undefined;

        try {
          const error = createSsoTimeoutError({
            profileName: 'test-profile',
            exitCode: 255,
          });

          expect(error.message).toContain('exitCode');
          expect(error.message).toContain('255');
        } finally {
          console.error = originalStderr;
        }
      });

      then('`code` would NOT survive — the reserved-key footgun', () => {
        const originalStderr = console.error;
        console.error = () => undefined;

        try {
          const error = createSsoTimeoutError({ code: 255 });

          // neither channel carries it: the constructor strips it before `fullMessage`, and the
          // getter strips it again. this asserts the LIBRARY behavior the rename exists to dodge
          expect(error.message).not.toContain('255');
          expect(
            (error as unknown as { metadata: Record<string, unknown> }).metadata
              .code,
          ).toBeUndefined();
        } finally {
          console.error = originalStderr;
        }
      });
    });
  });
});
