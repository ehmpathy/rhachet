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
});
