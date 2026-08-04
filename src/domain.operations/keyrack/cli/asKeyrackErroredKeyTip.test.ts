import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asKeyrackErroredKeyTip } from './asKeyrackErroredKeyTip';

describe('asKeyrackErroredKeyTip', () => {
  given('[case1] a caller-fixable ConstraintError with a hint', () => {
    when('[t0] the tip is cast', () => {
      then(
        'it renders the bare message + fix, never a retry or class dump',
        () => {
          const tip = asKeyrackErroredKeyTip({
            cause: new ConstraintError('aws.params found no AWS identity', {
              hint: 'run an SSO login, or attach an instance role',
            }),
            env: 'prod',
          });
          expect(tip).toEqual(
            'aws.params found no AWS identity — fix: run an SSO login, or attach an instance role',
          );
          expect(tip).not.toContain('ConstraintError');
          expect(tip).not.toContain('retry');
        },
      );
    });
  });

  given('[case2] a caller-fixable ConstraintError with no hint', () => {
    when('[t0] the tip is cast', () => {
      then(
        'it renders the bare message alone (no fix suffix, no retry)',
        () => {
          const tip = asKeyrackErroredKeyTip({
            cause: new ConstraintError('a bare constraint'),
            env: 'prod',
          });
          expect(tip).toEqual('a bare constraint');
          expect(tip).not.toContain('retry');
        },
      );
    });
  });

  given('[case3] a transient MalfunctionError', () => {
    when('[t0] the tip is cast', () => {
      then(
        'it appends a retry hint (a transient fault may clear on re-run)',
        () => {
          const tip = asKeyrackErroredKeyTip({
            cause: new MalfunctionError(
              'aws.params SSM read hit a transient throttle',
              {
                hint: 'transient — retry the unlock',
              },
            ),
            env: 'test',
          });
          expect(tip).toContain('aws.params SSM read hit a transient throttle');
          expect(tip).toContain('— retry: rhx keyrack unlock --env test');
          expect(tip).not.toContain('MalfunctionError');
        },
      );
    });
  });

  given('[case4] a non-Error cause', () => {
    when('[t0] the tip is cast', () => {
      then('it stringifies the cause and appends the retry hint', () => {
        const tip = asKeyrackErroredKeyTip({
          cause: 'raw string fault',
          env: null,
        });
        expect(tip).toContain('raw string fault');
        expect(tip).toContain('— retry: rhx keyrack unlock --env');
      });
    });
  });

  // clamp the class-token strip: the prefix is cut off the ACTUAL class identity
  // (constructor.name), so a class token that also appears LATER in the message body must not be
  // cut mid-message
  given('[case5] a message body that repeats the class token later', () => {
    when('[t0] the tip is cast', () => {
      then(
        'only the front class-token prefix is stripped, not a later occurrence',
        () => {
          const tip = asKeyrackErroredKeyTip({
            cause: new ConstraintError('body holds ConstraintError: again'),
            env: 'prod',
          });
          // the front "✋ ConstraintError: " is gone; the body's later token stays intact
          expect(tip).toEqual('body holds ConstraintError: again');
          expect(tip.startsWith('✋')).toBe(false);
        },
      );
    });
  });
});
