import { given, then, when } from 'test-fns';

import { asKeyrackSlugHash } from './asKeyrackSlugHash';

describe('asKeyrackSlugHash', () => {
  given('[case1] slug is provided', () => {
    when('[t0] asKeyrackSlugHash is called', () => {
      then('returns 16-char hash', () => {
        const result = asKeyrackSlugHash({ slug: 'ehmpathy.prep.AWS_PROFILE' });
        expect(result).toHaveLength(16);
      });
    });

    when('[t1] asKeyrackSlugHash is called twice with same slug', () => {
      then('returns same hash (deterministic)', () => {
        const result1 = asKeyrackSlugHash({
          slug: 'ehmpathy.prep.AWS_PROFILE',
        });
        const result2 = asKeyrackSlugHash({
          slug: 'ehmpathy.prep.AWS_PROFILE',
        });
        expect(result1).toEqual(result2);
      });
    });
  });

  given('[case2] different slugs', () => {
    when('[t0] asKeyrackSlugHash is called', () => {
      then('returns different hashes', () => {
        const result1 = asKeyrackSlugHash({
          slug: 'ehmpathy.prep.AWS_PROFILE',
        });
        const result2 = asKeyrackSlugHash({
          slug: 'ehmpathy.prod.AWS_PROFILE',
        });
        expect(result1).not.toEqual(result2);
      });
    });
  });
});
