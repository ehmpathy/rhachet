import { given, then, when } from 'test-fns';

import { genUnlockCode } from './genUnlockCode';

/**
 * .what = prove the visual-match code is the right length and drawn only from the
 *         unambiguous alphabet
 * .why  = the code's whole value is a confident eyeball match; an ambiguous glyph
 *         (0/O, 1/I/L) would produce false mismatches, so the alphabet must exclude
 *         them (rule.forbid.contextless-unlock-prompt visual-match code)
 */
describe('genUnlockCode', () => {
  const UNAMBIGUOUS = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/;

  given('[case1] the default length', () => {
    when('[t0] a code is minted', () => {
      const code = genUnlockCode();

      then('it is 4 chars long', () => {
        expect(code).toHaveLength(4);
      });

      then('every char is from the unambiguous alphabet', () => {
        expect(code).toMatch(UNAMBIGUOUS);
      });

      then('it never contains an ambiguous glyph (0/O/1/I/L)', () => {
        expect(code).not.toMatch(/[0O1IL]/);
      });
    });
  });

  given('[case2] a custom length', () => {
    when('[t0] a code of length 6 is minted', () => {
      const code = genUnlockCode({ length: 6 });

      then('it is 6 chars long, still unambiguous', () => {
        expect(code).toHaveLength(6);
        expect(code).toMatch(UNAMBIGUOUS);
      });
    });
  });

  given('[case3] many mints', () => {
    when('[t0] 200 codes are minted', () => {
      const codes = Array.from({ length: 200 }, () => genUnlockCode());

      then('they vary (not a constant) — a per-invocation nonce', () => {
        const distinct = new Set(codes);
        expect(distinct.size).toBeGreaterThan(1);
      });
    });
  });
});
