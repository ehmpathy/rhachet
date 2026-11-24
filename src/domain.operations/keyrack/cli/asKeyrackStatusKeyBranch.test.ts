import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';
import { asKeyrackKeyReachField } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachField';

import { asKeyrackStatusKeyBranch } from './asKeyrackStatusKeyBranch';

/**
 * .what = a fixed expiry stamp for the fixtures below
 * .why = ⚠️ these fixtures read `expiresAt: 0` until 2026-08-06 — an epoch-zero NUMBER,
 *        which is 1970 and matches no key the daemon could ever hold. that value was not
 *        carelessness, it was the wire type's lie made visible: `DaemonStatusRow.expiresAt`
 *        declared `number` while the server sent an iso stamp, so `0` was the cheapest
 *        value that satisfied the compiler. a wrong type does not merely fail to catch bad
 *        data — it MANUFACTURES it, one fixture at a time
 */
const EXPIRES_AT = asIsoTimeStamp(new Date('2026-08-06T12:00:00.000Z'));

/**
 * .what = snaps the `🔐 keyrack status` key branch, with and without a reach
 * .why = `status` is the surface a human reads to answer "what can this repo touch?",
 *        and the reach leaf is the whole answer. a snap puts the rendered rack in the
 *        pr diff, so a change to the leaf is seen rather than merely compiled
 *        (rule.require.contract-snapshot-exhaustiveness)
 */
describe('asKeyrackStatusKeyBranch', () => {
  given('[case1] a key cut for no reach', () => {
    when('[t0] it is rendered', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: {
          slug: 'ahbode.prep.EHMPATH_BEAVER_GITHUB_TOKEN',
          env: 'prep',
          org: 'ahbode',
          expiresAt: EXPIRES_AT,
          ttlLeftMs: 55 * 60 * 1000,
        },
        isLast: true,
        owner: 'ehmpath',
      });

      then(
        'no reach leaf is emitted — the branch is what it is today (e1)',
        () => {
          expect(lines.filter((line) => line.includes('reach:'))).toHaveLength(
            0,
          );
        },
      );

      then('it renders the extant shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });

  given('[case2] one slug held at three reaches — the rack', () => {
    // .note = this is the vision's headline demo: three keys, ONE name. same owner, same
    //         org, same env — the sole difference is which reach each opens
    const RACK = [
      { reach: undefined, ttlLeftMs: 55 * 60 * 1000 },
      {
        reach: asKeyrackKeyReach({ exid: 'github://org=ehmpathy' }),
        ttlLeftMs: 55 * 60 * 1000,
      },
      {
        reach: asKeyrackKeyReach({ exid: 'beav@ehmpathy.com' }),
        ttlLeftMs: 540 * 60 * 1000,
      },
    ];

    when('[t0] the whole rack is rendered', () => {
      const lines = RACK.flatMap((held, index) =>
        asKeyrackStatusKeyBranch({
          key: {
            slug: 'ahbode.prep.EHMPATH_BEAVER_GITHUB_TOKEN',
            env: 'prep',
            org: 'ahbode',
            ...asKeyrackKeyReachField({ reach: held.reach }),
            expiresAt: EXPIRES_AT,
            ttlLeftMs: held.ttlLeftMs,
          },
          isLast: index === RACK.length - 1,
          owner: 'ehmpath',
        }),
      );

      then('every branch heads with the same slug', () => {
        const heads = lines.filter((line) => line.includes('EHMPATH_BEAVER'));
        expect(heads).toHaveLength(3);
      });

      then('the reach leaf tells them apart, and sits right after org', () => {
        // .note = lastIndexOf lands on the SECOND non-last branch — the github one. the
        //         first non-last branch is the reachless key, whose org leaf is followed
        //         straight by `expires in` because it emits no reach leaf at all
        const orgAt = lines.lastIndexOf('   │  ├─ org: ahbode');
        expect(lines[orgAt + 1]).toEqual(
          '   │  ├─ reach: github://org=ehmpathy',
        );
      });

      then(
        'a plaintext account exid renders verbatim, no scheme parsed',
        () => {
          expect(lines).toContain('      ├─ reach: beav@ehmpathy.com');
        },
      );

      then('the rack reads as three keys, one name', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });

  /**
   * .what = a key the daemon holds with NO expiry at all
   * .why = `daemonKeyStore` treats an absent `expiresAt` as "no expiration — always valid",
   *        so this is a first-class stored state rather than a corner. `handleStatusCommand`
   *        yields its ttl as `null`, and this branch is the only place that value is read
   *
   * .note = ⚠️ this case had ZERO coverage until 2026-08-06, and it rendered WRONG. the
   *         server computed `Infinity`; the socket is JSON, and `JSON.stringify(Infinity)`
   *         is `"null"`; the branch then computed `Math.round(null / 1000 / 60)` — which is
   *         `0`, not `NaN`, because `null` coerces to zero. so a key that never dies was
   *         reported as `expires in: 0m`, which a human reads as ALREADY DEAD
   * .note = `0` is the cruelest possible wrong answer here. `NaN` or `Infinity` would have
   *         looked broken and been chased; `0m` looks like an ordinary expired key, so the
   *         human re-unlocks a key that never needed it and never learns why
   */
  given('[case3] a key held with no expiry', () => {
    when('[t0] it is rendered', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: {
          slug: 'ahbode.prep.EHMPATH_BEAVER_GITHUB_TOKEN',
          env: 'prep',
          org: 'ahbode',
          expiresAt: null,
          ttlLeftMs: null,
        },
        isLast: true,
        owner: 'ehmpath',
      });

      // ⚠️ THE clamp. under the extant arithmetic this line reads `expires in: 0m`
      then('it reports `never`, not a dead key', () => {
        expect(lines).toContain('      └─ expires in: never');
        expect(lines).not.toContain('      └─ expires in: 0m');
      });

      // .note = `never` is not a word this case invented. the `unlocked` branch of
      //         `emitKeyrackKeyBranch` already renders a no-expiry grant with exactly it,
      //         so the two surfaces now agree rather than merely both avoid a lie
      then('it uses the same word `unlock` uses for the same fact', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });

  /**
   * .what = the renew states of an sso key the daemon renews before expiry
   * .why = status is where the renew is seen at work, and where a lapse or a halt is
   *        named with its fix. each state is snapped so the rendered tree is reviewed
   */
  const SSO_KEY = {
    slug: 'ahbode.camp.AWS_PROFILE',
    env: 'camp',
    org: 'ahbode',
    expiresAt: EXPIRES_AT,
  };

  given('[case4] an sso key the daemon has renewed', () => {
    when('[t0] it is rendered', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: {
          ...SSO_KEY,
          ttlLeftMs: 52 * 60 * 1000,
          renew: { renewedCount: 4, mark: null },
        },
        isLast: true,
        owner: 'ehmpath',
      });

      then('it shows the renew count as a leaf, with no colon', () => {
        expect(lines).toContain('      ├─ expires in: 52m');
        expect(lines).toContain('      └─ renewed = 4x');
      });

      then('it renders the renewed shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });

  given('[case5] an sso key not yet renewed since its unlock', () => {
    when('[t0] it is rendered', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: {
          ...SSO_KEY,
          ttlLeftMs: 55 * 60 * 1000,
          renew: { renewedCount: 0, mark: null },
        },
        isLast: true,
        owner: 'ehmpath',
      });

      then('the renew reads as on, before its first renew lands', () => {
        expect(lines.at(-1)).toEqual('      └─ renew = on');
        expect(lines.some((line) => line.includes('renewed'))).toBe(false);
      });

      then('it renders the renew-on shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });

    when(
      '[t1] the key carries no renew at all (an older cli filed none)',
      () => {
        const lines = asKeyrackStatusKeyBranch({
          key: { ...SSO_KEY, ttlLeftMs: 55 * 60 * 1000 },
          isLast: true,
          owner: 'ehmpath',
        });

        then('no renew leaf is emitted, so its absence is the cue', () => {
          expect(lines.at(-1)).toEqual('      └─ expires in: 55m');
          expect(lines.some((line) => line.includes('renew'))).toBe(false);
        });

        then('it renders the no-renew shape', () => {
          expect(lines).toMatchSnapshot();
        });
      },
    );

    when('[t2] the grant already expires at its cap', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: {
          ...SSO_KEY,
          ttlLeftMs: 5 * 60 * 1000,
          renew: { renewedCount: 0, mark: null, isAtCap: true },
        },
        isLast: true,
        owner: 'ehmpath',
      });

      then('the renew reads as off, never on, and names where it ends', () => {
        expect(lines).toContain('      └─ renew = off');
        expect(lines).toContain(
          '         └─ at its cap — ends at expiry, unlock to extend',
        );
        expect(lines.at(-1)).toMatch(
          /^ {12}└─ rhx keyrack unlock --owner ehmpath --env \S+$/,
        );
        expect(lines.some((line) => line.includes('renew = on'))).toBe(false);
      });

      then('it renders the at-cap shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });

  given('[case5b] an sso key whose renews reached its cap', () => {
    when('[t0] it is rendered', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: {
          ...SSO_KEY,
          ttlLeftMs: 30 * 60 * 1000,
          renew: { renewedCount: 4, mark: null, isAtCap: true },
        },
        isLast: true,
        owner: 'ehmpath',
      });

      then('the count says the key ends at its cap', () => {
        expect(lines).toContain('      └─ renewed = 4x');
        expect(lines).toContain(
          '         └─ at its cap — ends at expiry, unlock to extend',
        );
        expect(lines.at(-1)).toMatch(
          /^ {12}└─ rhx keyrack unlock --owner ehmpath --env \S+$/,
        );
      });

      then('the render matches its snapshot', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });

  given('[case6] an sso key whose portal session lapsed', () => {
    when('[t0] the grant still lives', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: {
          ...SSO_KEY,
          ttlLeftMs: 8 * 60 * 1000,
          renew: { renewedCount: 0, mark: { kind: 'lapsed', error: null } },
        },
        isLast: true,
        owner: 'ehmpath',
      });

      then('it names the lapse and the fix', () => {
        expect(lines).toContain('      └─ lapsed');
        expect(lines).toContain(
          '         ├─ sso session ended, no renew until the next unlock',
        );
        expect(lines).toContain(
          '            └─ rhx keyrack unlock --owner ehmpath --env camp',
        );
      });

      then('it renders the lapsed shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });

    when('[t1] the grant has expired', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: {
          ...SSO_KEY,
          ttlLeftMs: 0,
          renew: { renewedCount: 6, mark: { kind: 'lapsed', error: null } },
        },
        isLast: true,
        owner: 'ehmpath',
      });

      then('it reads `expired`, never `expires in: 0m`', () => {
        expect(lines).toContain('      ├─ expired');
        expect(lines.some((line) => line.includes('expires in'))).toBe(false);
      });

      then('it renders the lapsed-and-expired shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });

  given('[case7] an sso key whose renew halted on a persistent fault', () => {
    when('[t0] the grant has expired', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: {
          ...SSO_KEY,
          ttlLeftMs: 0,
          renew: {
            renewedCount: 2,
            mark: {
              kind: 'halted',
              error:
                'aws configure export-credentials failed with unexpected error',
            },
          },
        },
        isLast: true,
        owner: 'ehmpath',
      });

      then('it names the halt, the last error, and the fix', () => {
        expect(lines).toContain('      └─ halted');
        expect(lines).toContain(
          '         ├─ renew stopped on a fault it could not clear',
        );
        expect(lines).toContain(
          '         ├─ aws configure export-credentials failed with unexpected error',
        );
      });

      then('it renders the halted shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });

    when('[t1] the error carries a helpful error metadata block', () => {
      // the shape the daemon stores: a headline, a blank line, then a json block
      const lines = asKeyrackStatusKeyBranch({
        key: {
          ...SSO_KEY,
          ttlLeftMs: 0,
          renew: {
            renewedCount: 2,
            mark: {
              kind: 'halted',
              error: [
                '💥 MalfunctionError: aws configure export-credentials failed with unexpected error',
                '',
                '{',
                '  "profileName": "ahbode-camp"',
                '}',
              ].join('\n'),
            },
          },
        },
        isLast: true,
        owner: 'ehmpath',
      });

      then(
        'each line is a tree line — the leaf holds the headline only',
        () => {
          expect(lines).toContain(
            '         ├─ 💥 MalfunctionError: aws configure export-credentials failed with unexpected error',
          );
          expect(lines.every((line) => !line.includes('\n'))).toEqual(true);
          expect(lines.join('\n')).not.toContain('profileName');
        },
      );

      then('it renders the headline-only shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });

    when('[t2] the halt was a code defect', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: {
          ...SSO_KEY,
          ttlLeftMs: 0,
          renew: {
            renewedCount: 0,
            mark: {
              kind: 'halted',
              error: '💥 defect TypeError: grant.expiresAt is not a function',
            },
          },
        },
        isLast: true,
        owner: 'ehmpath',
      });

      then('it names a defect no retry clears, and offers no prune', () => {
        expect(lines).toContain(
          '         ├─ renew stopped on a code defect, which no retry clears',
        );
        expect(lines.join('\n')).toContain(
          'report the defect, with its full error above',
        );
        expect(lines.join('\n')).not.toContain('daemon prune');
      });

      then('it renders the defect-halt shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });

  given('[case8] a marked key in a rack with no owner', () => {
    when('[t0] it is rendered', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: {
          ...SSO_KEY,
          ttlLeftMs: 0,
          renew: { renewedCount: 0, mark: { kind: 'lapsed', error: null } },
        },
        isLast: false,
        owner: null,
      });

      then('the fix names no owner flag', () => {
        expect(lines).toContain('   │        └─ rhx keyrack unlock --env camp');
      });

      then('it renders the no-owner shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });

  given('[case9] a marked sudo sso key', () => {
    when('[t0] it is rendered', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: {
          slug: 'ahbode.sudo.AWS_PROFILE',
          env: 'sudo',
          org: 'ahbode',
          expiresAt: EXPIRES_AT,
          ttlLeftMs: 0,
          renew: { renewedCount: 1, mark: { kind: 'lapsed', error: null } },
        },
        isLast: true,
        owner: 'ehmpath',
      });

      then('the fix names the key, since a sudo env sweep is refused', () => {
        expect(lines).toContain(
          '            └─ rhx keyrack unlock --owner ehmpath --env sudo --key AWS_PROFILE',
        );
      });

      then('it renders the sudo fix shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });
});
