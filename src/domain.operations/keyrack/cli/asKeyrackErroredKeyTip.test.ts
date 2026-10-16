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
            slug: 'ahbode.prod.AWS_PROFILE',
            orgDefault: null,
            owner: null,
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
            slug: 'ahbode.prod.AWS_PROFILE',
            orgDefault: null,
            owner: null,
          });
          expect(tip).toEqual('a bare constraint');
          expect(tip).not.toContain('retry');
        },
      );
    });
  });

  given('[case3] a transient MalfunctionError', () => {
    when('[t0] the key sits under the default org', () => {
      then('the retry names the one key, with no `--org`', () => {
        const tip = asKeyrackErroredKeyTip({
          cause: new MalfunctionError(
            'aws.params SSM read hit a transient throttle',
            {
              hint: 'transient — retry the unlock',
            },
          ),
          slug: 'ahbode.test.AWS_PROFILE',
          orgDefault: 'ahbode',
          owner: null,
        });
        expect(tip).toEqual(
          'aws.params SSM read hit a transient throttle — retry: rhx keyrack unlock --env test --key AWS_PROFILE',
        );
        expect(tip).not.toContain('MalfunctionError');
      });
    });

    // case=8 — a member key retried with no `--org` would read the default org's twin
    when('[t1] the key sits under a non-default allowlist member', () => {
      then('the retry carries `--org <member>`', () => {
        const tip = asKeyrackErroredKeyTip({
          cause: new MalfunctionError('a transient throttle'),
          slug: 'bhanya.camp.AWS_PROFILE',
          orgDefault: 'ahbode',
          owner: null,
        });
        expect(tip).toEqual(
          'a transient throttle — retry: rhx keyrack unlock --env camp --key AWS_PROFILE --org bhanya',
        );
      });
    });

    when('[t2] the key sits under the grove scope `@all`', () => {
      then('the retry carries `--org @all`', () => {
        const tip = asKeyrackErroredKeyTip({
          cause: new MalfunctionError('a transient throttle'),
          slug: '@all.camp.GITHUB_TOKEN',
          orgDefault: 'ahbode',
          owner: null,
        });
        expect(tip).toEqual(
          'a transient throttle — retry: rhx keyrack unlock --env camp --key GITHUB_TOKEN --org @all',
        );
      });
    });

    when('[t3] the unlock ran as a named owner', () => {
      then('the retry carries `--owner <owner>`', () => {
        const tip = asKeyrackErroredKeyTip({
          cause: new MalfunctionError('a transient throttle'),
          slug: 'ahbode.test.AWS_PROFILE',
          orgDefault: 'ahbode',
          owner: 'ehmpath',
        });
        expect(tip).toEqual(
          'a transient throttle — retry: rhx keyrack unlock --owner ehmpath --env test --key AWS_PROFILE',
        );
      });
    });
  });

  given('[case4] a non-Error cause', () => {
    when('[t0] the tip is cast', () => {
      then('it stringifies the cause and appends the keyed retry', () => {
        const tip = asKeyrackErroredKeyTip({
          cause: 'raw string fault',
          slug: 'ahbode.prod.AWS_PROFILE',
          orgDefault: null,
          owner: null,
        });
        expect(tip).toEqual(
          'raw string fault — retry: rhx keyrack unlock --env prod --key AWS_PROFILE',
        );
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
            slug: 'ahbode.prod.AWS_PROFILE',
            orgDefault: null,
            owner: null,
          });
          // the front "✋ ConstraintError: " is gone; the body's later token stays intact
          expect(tip).toEqual('body holds ConstraintError: again');
          expect(tip.startsWith('✋')).toBe(false);
        },
      );
    });
  });
});
