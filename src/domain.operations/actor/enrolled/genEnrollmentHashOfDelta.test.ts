import { given, then, when } from 'test-fns';

import { createHash } from 'node:crypto';
import { genEnrollmentHash } from './genEnrollmentHash';
import { genEnrollmentHashOfDelta } from './genEnrollmentHashOfDelta';

describe('genEnrollmentHashOfDelta', () => {
  given('[case1] a brain + delta', () => {
    when('[t0] hashed', () => {
      const hash = genEnrollmentHashOfDelta({
        brain: 'claude',
        rolesDelta: ['-driver'],
      });

      then('it is an 8-char hex digest, deterministic', () => {
        expect(hash).toMatch(/^[0-9a-f]{8}$/);
        expect(
          genEnrollmentHashOfDelta({
            brain: 'claude',
            rolesDelta: ['-driver'],
          }),
        ).toEqual(hash);
      });
    });
  });

  given('[case2] the same delta in a different order', () => {
    when('[t0] each order is hashed', () => {
      const rolesDelta = ['-driver', '+architect'];
      const ab = genEnrollmentHashOfDelta({ brain: 'claude', rolesDelta });
      const ba = genEnrollmentHashOfDelta({
        brain: 'claude',
        rolesDelta: ['+architect', '-driver'],
      });

      then('token ORDER never forks the identity — one hash', () => {
        expect(ab).toEqual(ba);
      });

      then('the caller array is never mutated (sort is on a copy)', () => {
        expect(rolesDelta).toEqual(['-driver', '+architect']);
      });
    });
  });

  given('[case3] a delta and a concrete roleset of the same tokens', () => {
    when('[t0] each is hashed', () => {
      then('the two shapes never collide', () => {
        expect(
          genEnrollmentHashOfDelta({
            brain: 'claude',
            rolesDelta: ['-driver'],
          }),
        ).not.toEqual(
          genEnrollmentHash({ brain: 'claude', roles: ['-driver'] }),
        );
      });
    });
  });

  /**
   * .why = the digest shape keys every extant delta actor dir; a drift orphans them all,
   *        so the expected value is the documented formula itself
   */
  given('[case4] the extant delta digest shape', () => {
    when('[t0] a two-token delta is hashed', () => {
      then(
        'it equals sha256 of { brain, base: ambient, sorted delta }, first 8 hex chars',
        () => {
          const expected = createHash('sha256')
            .update(
              '{"brain":"claude","base":"ambient","delta":["+architect","-driver"]}',
            )
            .digest('hex')
            .slice(0, 8);
          expect(
            genEnrollmentHashOfDelta({
              brain: 'claude',
              rolesDelta: ['-driver', '+architect'],
            }),
          ).toEqual(expected);
        },
      );
    });
  });
});
