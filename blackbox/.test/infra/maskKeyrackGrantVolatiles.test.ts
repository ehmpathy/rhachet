import { given, then, when } from 'test-fns';

import { maskKeyrackGrantVolatiles } from './maskKeyrackGrantVolatiles';

/**
 * .what = unit for the journey/acceptance snapshot determinism point (c38)
 * .why = the mask is the SINGLE seam every journey snapshot passes through before toMatchSnapshot;
 *        a regex miss here silently flakes (a live token/clock leaks) or falsely passes (a stale
 *        value snapshots green). so the mask earns a direct unit: token→<token>, ts→__TIMESTAMP__, and — the
 *        anti-over-mask case — a stdout with neither volatile is returned UNCHANGED (the seeded
 *        reference value must survive verbatim, that determinism is the whole point of the emulator)
 */
describe('maskKeyrackGrantVolatiles', () => {
  given('[case1] a minted github-app installation token in stdout', () => {
    when('[t0] masked', () => {
      then('the ghs_ token becomes <token>', () => {
        const out = maskKeyrackGrantVolatiles({
          stdout: '   └─ secret: ghs_16C7e42F292c6912E7710c838347Ae178B4a',
        });
        expect(out).toEqual('   └─ secret: <token>');
      });
    });
  });

  given('[case2] a relative expiry render (the live clock countdown)', () => {
    when('[t0] masked', () => {
      then('"expires in: 55m" becomes "expires in: __TIMESTAMP__"', () => {
        const out = maskKeyrackGrantVolatiles({
          stdout: '   └─ expires in: 55m',
        });
        expect(out).toEqual('   └─ expires in: __TIMESTAMP__');
      });
    });

    when('[t1] the same field at a different countdown', () => {
      then('a different minute count masks to the SAME placeholder (stable)', () => {
        const a = maskKeyrackGrantVolatiles({ stdout: 'expires in: 55m' });
        const b = maskKeyrackGrantVolatiles({ stdout: 'expires in: 12m' });
        expect(a).toEqual(b);
        expect(a).toEqual('expires in: __TIMESTAMP__');
      });
    });
  });

  given('[case3] a raw iso-8601 timestamp (a --json expiresAt)', () => {
    when('[t0] masked', () => {
      then('the iso timestamp becomes __TIMESTAMP__', () => {
        const out = maskKeyrackGrantVolatiles({
          stdout: '"expiresAt": "2026-07-30T14:30:00.000Z"',
        });
        expect(out).toEqual('"expiresAt": "__TIMESTAMP__"');
      });
    });
  });

  given('[case4] a stdout with BOTH volatiles', () => {
    when('[t0] masked', () => {
      then('both are replaced in one pass', () => {
        const out = maskKeyrackGrantVolatiles({
          stdout:
            'secret: ghs_abc123DEF456 | expires in: 55m | at 2026-07-30T14:30:00Z',
        });
        expect(out).toEqual(
          'secret: <token> | expires in: __TIMESTAMP__ | at __TIMESTAMP__',
        );
      });
    });
  });

  given('[case5] a stdout with NEITHER volatile (the anti-over-mask case)', () => {
    when('[t0] masked', () => {
      then('it is returned UNCHANGED — the seeded reference value survives verbatim', () => {
        const stdout = [
          '🔓 keyrack unlock',
          '   └─ ehmpathy.test.ANTHROPIC_API_KEY',
          '      └─ secret: sk-ant-seeded-fixture-value',
          '   └─ expires in: never',
        ].join('\n');
        expect(maskKeyrackGrantVolatiles({ stdout })).toEqual(stdout);
      });
    });
  });
});
