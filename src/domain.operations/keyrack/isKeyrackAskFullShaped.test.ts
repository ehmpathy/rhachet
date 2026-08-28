import { given, then, when } from 'test-fns';

import { isKeyrackAskFullShaped } from './isKeyrackAskFullShaped';

/**
 * .what = clamps which of the three sanctioned ask shapes read as "already prefixed"
 * .why = the caller builds `@all.{env}.` onto an ask this says NO to. a wrong YES drops the
 *        prefix a bare name needs; a wrong NO rebuilds a prefix the ask already carries — the
 *        doubled `@all.{env}.@all.{env}.KEY` that made a reach-cut key report `absent` at i007
 */
describe('isKeyrackAskFullShaped', () => {
  given('[case1] a bare key name — the shape that still needs a prefix', () => {
    when('[t0] the shape is read', () => {
      then('it is NOT full shaped', () => {
        expect(isKeyrackAskFullShaped({ ask: 'BRAINS_AUTH' })).toEqual(false);
      });
    });
  });

  given('[case2] a full slug', () => {
    when('[t0] the shape is read', () => {
      then('it IS full shaped', () => {
        expect(
          isKeyrackAskFullShaped({ ask: '@all.prep.BRAINS_AUTH' }),
        ).toEqual(true);
      });
    });
  });

  given('[case1b] a bare key name that HOLDS a dot', () => {
    // ⛔ THE STRICTNESS CLAMP. `MY.TOKEN` is a bare name — it carries no org and no env, so the
    //    caller still owes it a prefix. the weak `includes('.')` test answers YES here and the
    //    prefix is dropped, which is the i007 defect read from the other side of the branch.
    //    RED before the strengthened test, which demands a REAL env in segment[1]
    when('[t0] the shape is read', () => {
      then('it is NOT full shaped', () => {
        expect(isKeyrackAskFullShaped({ ask: 'MY.TOKEN' })).toEqual(false);
      });
    });

    when('[t1] it holds enough dots to reach three segments', () => {
      // segment count alone is not enough either — `MY.LONG.TOKEN` has three, and `LONG` is
      // no env. only a real env segment proves the ask carries its own prefix
      then('it is STILL not full shaped', () => {
        expect(isKeyrackAskFullShaped({ ask: 'MY.LONG.TOKEN' })).toEqual(false);
      });
    });
  });

  given('[case3] a full ADDRESS, whose reach exid holds its own dots', () => {
    // ⚠️ the reach half (`casey@ahction.com`) carries dots of its own, so those extra segments
    //    must not disturb the read — the env still sits at segment[1], and the address is never
    //    rebuilt from the split (`term=address`)
    when('[t0] the shape is read', () => {
      then('it IS full shaped', () => {
        expect(
          isKeyrackAskFullShaped({
            ask: '@all.prep.BRAINS_AUTH@casey@ahction.com',
          }),
        ).toEqual(true);
      });
    });
  });

  given('[case4] no ask at all — the bulk, key-less unlock', () => {
    when('[t0] the shape is read', () => {
      // a null ask names no candidate to prefix, so it must read false rather than throw
      then('it is NOT full shaped', () => {
        expect(isKeyrackAskFullShaped({ ask: null })).toEqual(false);
      });
    });
  });
});
