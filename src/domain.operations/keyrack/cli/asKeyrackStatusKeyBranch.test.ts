import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';
import { asKeyrackKeyReachField } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachField';

import { asKeyrackStatusKeyBranch } from './asKeyrackStatusKeyBranch';

/**
 * .what = a fixed expiry stamp for the fixtures below
 * .why = ⚠️ these fixtures read `expiresAt: 0` until 2026-08-06 — an epoch-zero NUMBER,
 *        which is 1970 and matches no key the daemon could ever hold. that value was not
 *        carelessness, it was the wire type's lie made visible: `DaemonStatusKey.expiresAt`
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
          expiresIn: { minutes: 55 },
        },
        isLast: true,
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
      { reach: undefined, expiresIn: { minutes: 55 } },
      {
        reach: asKeyrackKeyReach({ exid: 'github://org=ehmpathy' }),
        expiresIn: { minutes: 55 },
      },
      {
        reach: asKeyrackKeyReach({ exid: 'beav@ehmpathy.com' }),
        expiresIn: { minutes: 540 },
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
            expiresIn: held.expiresIn,
          },
          isLast: index === RACK.length - 1,
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
   *        yields its `expiresIn` as `null`, and this branch is the only place that value is read
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
          expiresIn: null,
        },
        isLast: true,
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
   * .what = the renewal states of an sso key the daemon renews before expiry
   * .why = status shows one leaf for the renewal, `renewal = <status>`, and an expired key
   *        shows `expired` alone; the count and a halt's cause live in `--json`
   */
  const SSO_KEY = {
    slug: 'ahbode.camp.AWS_PROFILE',
    env: 'camp',
    org: 'ahbode',
    expiresAt: EXPIRES_AT,
  };

  given('[case4] an sso key the daemon renews', () => {
    when('[t0] the renewal is on', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: {
          ...SSO_KEY,
          expiresIn: { minutes: 52 },
          renewal: { status: 'on', count: { renewed: 4 }, error: null },
        },
        isLast: true,
      });

      then('it shows the expiry, then `renewal = on`, and no count', () => {
        expect(lines).toContain('      ├─ expires in: 52m');
        expect(lines.at(-1)).toEqual('      └─ renewal = on');
        expect(lines.some((line) => line.includes('4'))).toBe(false);
      });

      then('it renders the renewal-on shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });

    when('[t1] the key carries no renewal (an older cli filed none)', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: { ...SSO_KEY, expiresIn: { minutes: 55 } },
        isLast: true,
      });

      then('no renewal leaf is emitted', () => {
        expect(lines.at(-1)).toEqual('      └─ expires in: 55m');
        expect(lines.some((line) => line.includes('renewal'))).toBe(false);
      });
    });

    when('[t2] the grant already expires at its max', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: {
          ...SSO_KEY,
          expiresIn: { minutes: 5 },
          renewal: { status: 'off', count: { renewed: 4 }, error: null },
        },
        isLast: true,
      });

      then('the renewal reads `off`, never `on`', () => {
        expect(lines.at(-1)).toEqual('      └─ renewal = off');
      });

      then('it renders the renewal-off shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });

  given('[case5] an sso key whose renewal stopped', () => {
    when('[t0] the portal session lapsed, the grant still lives', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: {
          ...SSO_KEY,
          expiresIn: { minutes: 8 },
          renewal: { status: 'lapsed', count: { renewed: 0 }, error: null },
        },
        isLast: true,
      });

      then('it shows the expiry, then `renewal = lapsed`', () => {
        expect(lines).toContain('      ├─ expires in: 8m');
        expect(lines.at(-1)).toEqual('      └─ renewal = lapsed');
      });

      then('it renders the lapsed shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });

    when('[t1] the renewal lapsed and the grant has expired', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: {
          ...SSO_KEY,
          expiresIn: { seconds: 0 },
          renewal: { status: 'lapsed', count: { renewed: 6 }, error: null },
        },
        isLast: true,
      });

      then('it reads `expired` alone, never `expires in: 0m`', () => {
        expect(lines.at(-1)).toEqual('      └─ expired');
        expect(lines.some((line) => line.includes('expires in'))).toBe(false);
        expect(lines.some((line) => line.includes('renewal'))).toBe(false);
      });

      then('it renders the expired shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });

    when('[t2] the renewal halted and the grant has expired', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: {
          ...SSO_KEY,
          expiresIn: { seconds: 0 },
          renewal: {
            status: 'halted',
            count: { renewed: 2 },
            error: 'aws configure export-credentials failed',
          },
        },
        isLast: true,
      });

      then('it reads `expired` alone; the cause lives in `--json`', () => {
        expect(lines.at(-1)).toEqual('      └─ expired');
        expect(lines.join('\n')).not.toContain('export-credentials');
      });
    });

    when('[t3] the renewal halted and the grant still lives', () => {
      const lines = asKeyrackStatusKeyBranch({
        key: {
          ...SSO_KEY,
          expiresIn: { minutes: 3 },
          renewal: {
            status: 'halted',
            count: { renewed: 2 },
            error: 'aws configure export-credentials failed',
          },
        },
        isLast: true,
      });

      then('it shows the expiry, then `renewal = halted`', () => {
        expect(lines).toContain('      ├─ expires in: 3m');
        expect(lines.at(-1)).toEqual('      └─ renewal = halted');
      });

      then('it renders the halted shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });
});
