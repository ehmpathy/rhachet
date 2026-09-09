import { given, then, when } from 'test-fns';

import { isKeyrackSecretShaped } from './isKeyrackSecretShaped';

/**
 * .what = the clamp on the VALUE-shaped credential mask
 * .why = the key-name mask it backs up cannot be tested for the leak it misses — a leak under an
 *        unnamed key is a SUCCESSFUL render, byte-identical in shape to a correct one. so the
 *        predicate is clamped directly, on both sides
 *
 * .note = the two sides are not symmetric in cost. a false NEGATIVE is a credential in a ci log;
 *         a false POSITIVE is one leaf that reads `__REDACTED__`. the negative rows below are
 *         therefore the ones that keep the predicate honest — they are the real context a human
 *         came to the refusal for, and it must survive
 */
describe('isKeyrackSecretShaped', () => {
  given('[case1] a value that walks like a credential', () => {
    when('[t0] it carries a known vendor prefix', () => {
      then('each is masked', () => {
        // .note = ghs_ is the github-app install token — the `@all` bootstrap credential this
        //         whole wish exists to make readable. it is the one most likely to reach a throw
        const credentials = [
          'ghs_16C7e42F292c6912E7710c838347Ae178B4a',
          'ghp_16C7e42F292c6912E7710c838347Ae178B4a',
          'github_pat_11ABCDEFG0abcdefghijkl',
          'glpat-ABCdef123456789',
          'sk-proj-abcDEF123456',
          'sk_live_51abcDEF',
          'xoxb-1234-5678-abcdefg',
          'AKIAIOSFODNN7EXAMPLE',
          'ASIAIOSFODNN7EXAMPLE',
          'AIzaSyD-abcdefghijklmnop',
          'ya29.a0AfH6SMBx',
          'npm_abcDEF123456',
          'dop_v1_abcdef123456',
          'shpat_abcdef123456',
        ];
        for (const value of credentials)
          expect({ value, masked: isKeyrackSecretShaped({ value }) }).toEqual({
            value,
            masked: true,
          });
      });
    });

    when('[t1] it is a pem private key block', () => {
      then('it is masked', () => {
        expect(
          isKeyrackSecretShaped({
            value: '-----BEGIN RSA PRIVATE KEY-----\nMIIEow...',
          }),
        ).toBe(true);
      });
    });

    when('[t2] it is a jwt', () => {
      then('it is masked', () => {
        expect(
          isKeyrackSecretShaped({
            value:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NSJ9.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
          }),
        ).toBe(true);
      });
    });

    when(
      '[t3] it is an opaque high-entropy token under no known prefix',
      () => {
        // ⚠️ .why = this is the row the key-name mask cannot cover. a vault returns an opaque blob
        //        and a throw site stores it under `value` or `data`; only its SHAPE gives it away
        then('it is masked', () => {
          expect(
            isKeyrackSecretShaped({
              value: 'aB3dE7fG9hJ2kL4mN6pQ8rS1tU5vW0xY7zA',
            }),
          ).toBe(true);
        });
      },
    );
  });

  given('[case2] real refusal context that must SURVIVE the mask', () => {
    when('[t0] it is a keyrack slug', () => {
      then('it renders', () => {
        for (const value of [
          '@all.camp.GITHUB_TOKEN',
          'ehmpathy.prep.AWS_PROFILE',
          '@all.all.SHARED',
        ])
          expect({ value, masked: isKeyrackSecretShaped({ value }) }).toEqual({
            value,
            masked: false,
          });
      });
    });

    when('[t1] it is a git sha', () => {
      // .why = 40 hex chars, length ≥ 32 and alphanumeric — it clears two of the three opaque
      //        demands. the uppercase demand is what keeps it readable
      then('it renders', () => {
        expect(
          isKeyrackSecretShaped({
            value: '6840c691f2a4b8c0d3e5f7a9b1c3d5e7f9a0b2c4',
          }),
        ).toBe(false);
      });
    });

    when('[t2] it is an env var name, a path, or a sentence', () => {
      then('each renders', () => {
        for (const value of [
          'GITHUB_TOKEN',
          'AWS_SECRET_ACCESS_KEY_NAME_THAT_IS_QUITE_LONG',
          '.agent/keyrack.yml',
          '/home/user/git/ehmpathy/rhachet/src/index.ts',
          'no keyrack.yml found in this repo or any parent',
          'must be one of: aws.params, onepassword, keychain',
        ])
          expect({ value, masked: isKeyrackSecretShaped({ value }) }).toEqual({
            value,
            masked: false,
          });
      });
    });

    when('[t3] it is a short opaque value', () => {
      // .why = the length floor is what keeps an org name, an env, and a uuid-ish handle readable
      then('it renders', () => {
        expect(isKeyrackSecretShaped({ value: 'aB3dE7fG9hJ2' })).toBe(false);
      });
    });

    when('[t4] it is empty or whitespace', () => {
      then('it renders (and never trips the mask)', () => {
        expect(isKeyrackSecretShaped({ value: '' })).toBe(false);
        expect(isKeyrackSecretShaped({ value: '   ' })).toBe(false);
      });
    });
  });
});
