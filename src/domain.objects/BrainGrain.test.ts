/**
 * .what = type-level tests for BrainGrain discriminant
 * .why = verifies type safety for atom vs repl conditional types
 *
 * .note = these tests run at compile time, not runtime
 */

import type { BrainGrain } from './BrainGrain';

/**
 * test: BrainGrain accepts 'atom'
 */
() => {
  const slug: BrainGrain = 'atom';
  void slug;
};

/**
 * test: BrainGrain accepts 'repl'
 */
() => {
  const slug: BrainGrain = 'repl';
  void slug;
};

/**
 * test: BrainGrain rejects invalid values
 */
() => {
  // @ts-expect-error - 'invalid' is not a valid BrainGrain
  const slug: BrainGrain = 'invalid';
  void slug;
};

/**
 * test: conditional type can discriminate on slug
 */
() => {
  type SeriesForSlug<T extends BrainGrain> = T extends 'repl'
    ? 'BrainSeries'
    : T extends 'atom'
      ? null
      : never;

  // atom should produce null
  type AtomSeries = SeriesForSlug<'atom'>;
  const _atomSeries: AtomSeries = null;

  // repl should produce 'BrainSeries'
  type ReplSeries = SeriesForSlug<'repl'>;
  const _replSeries: ReplSeries = 'BrainSeries';

  // prevent unused warnings
  void _atomSeries;
  void _replSeries;
};

/**
 * runtime test that validates the type tests compiled successfully
 */
describe('BrainGrain types', () => {
  it('should compile type tests successfully', () => {
    // if we reach here, all type tests above compiled successfully
    expect(true).toBe(true);
  });
});
