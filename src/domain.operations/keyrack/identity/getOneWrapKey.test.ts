import { given, then, when } from 'test-fns';

import { getOneWrapKey } from './getOneWrapKey';

/**
 * .what = unit-test the sign-as-KDF wrap-key derivation
 * .why  = determinism + distinctness are the properties sign-as-KDF rests on
 *
 * .note = pure function, no i/o — a unit test with fixed byte inputs
 */
describe('getOneWrapKey', () => {
  const sigA = new Uint8Array(64).fill(7);
  const sigB = new Uint8Array(64).fill(9);

  given('[case1] the same signature', () => {
    when('[t0] the wrap key is derived twice', () => {
      then('the two derivations are byte-identical (deterministic)', () => {
        const k1 = getOneWrapKey({ signature: sigA });
        const k2 = getOneWrapKey({ signature: sigA });
        expect(Buffer.from(k1).equals(Buffer.from(k2))).toBe(true);
      });

      then('the wrap key is 32 bytes (aes-256 sized)', () => {
        expect(getOneWrapKey({ signature: sigA }).length).toBe(32);
      });
    });
  });

  given('[case2] two different signatures', () => {
    when('[t0] wrap keys are derived from each', () => {
      then('the wrap keys differ', () => {
        const kA = getOneWrapKey({ signature: sigA });
        const kB = getOneWrapKey({ signature: sigB });
        expect(Buffer.from(kA).equals(Buffer.from(kB))).toBe(false);
      });
    });
  });

  given('[case3] a known fixed signature', () => {
    when('[t0] the wrap key is derived', () => {
      then('it matches the recorded snapshot (regression guard)', () => {
        const key = getOneWrapKey({ signature: new Uint8Array(64).fill(1) });
        expect(Buffer.from(key).toString('hex')).toMatchSnapshot();
      });
    });
  });
});
