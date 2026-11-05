import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asBootCorpusWithCacheBoundary } from './asBootCorpusWithCacheBoundary';
import { BOOT_STATS_ZERO } from './BootStats';
import { BOOT_CACHE_BOUNDARY_LINE } from './getOneBootCacheBoundary';

const asContent = (input: { repo: string; role: string; body: string }) => ({
  ref: { repo: input.repo, role: input.role },
  body: input.body,
  stats: { ...BOOT_STATS_ZERO, roles: 1 },
});

const PUBLISHED = asContent({
  repo: 'ehmpathy',
  role: 'mechanic',
  body: 'published body\n',
});
const LOCAL = asContent({ repo: '.this', role: 'any', body: 'local body\n' });

/**
 * .what = the count of lines in a corpus that are the boundary line
 */
const asBoundaryCount = (body: string): number =>
  body.split('\n').filter((line) => line === BOOT_CACHE_BOUNDARY_LINE).length;

describe('asBootCorpusWithCacheBoundary', () => {
  given('[case1] published roles and a repo=.this tail', () => {
    when('[t0] the corpus is joined', () => {
      then(
        'the boundary sits once, after the published roles and before the tail',
        () => {
          const corpus = asBootCorpusWithCacheBoundary({
            published: [PUBLISHED],
            local: [LOCAL],
          });
          expect(asBoundaryCount(corpus.body)).toEqual(1);
          const offsetPublished = corpus.body.indexOf('published body');
          const offsetBoundary = corpus.body.indexOf(BOOT_CACHE_BOUNDARY_LINE);
          const offsetLocal = corpus.body.indexOf('local body');
          expect(offsetPublished).toBeLessThan(offsetBoundary);
          expect(offsetBoundary).toBeLessThan(offsetLocal);
        },
      );

      then('the stats sum every role, and the boundary adds none', () => {
        const corpus = asBootCorpusWithCacheBoundary({
          published: [PUBLISHED],
          local: [LOCAL],
        });
        expect(corpus.stats.roles).toBeGreaterThanOrEqual(2);
        const corpusNoTail = asBootCorpusWithCacheBoundary({
          published: [PUBLISHED],
          local: [],
        });
        expect(corpus.stats.roles - corpusNoTail.stats.roles).toEqual(1);
      });
    });
  });

  given('[case2] published roles and no repo=.this tail', () => {
    when('[t0] the corpus is joined', () => {
      then('it holds no boundary line', () => {
        const corpus = asBootCorpusWithCacheBoundary({
          published: [PUBLISHED],
          local: [],
        });
        expect(asBoundaryCount(corpus.body)).toEqual(0);
      });
    });
  });

  given('[case3] the same roles joined twice', () => {
    when('[t0] each corpus is joined', () => {
      then('the two corpora are byte-equal', () => {
        const first = asBootCorpusWithCacheBoundary({
          published: [PUBLISHED],
          local: [LOCAL],
        });
        const second = asBootCorpusWithCacheBoundary({
          published: [PUBLISHED],
          local: [LOCAL],
        });
        expect(second.body).toEqual(first.body);
      });
    });
  });

  given('[case4] a role body that holds the boundary on its own line', () => {
    when('[t0] the corpus is joined', () => {
      then('it refuses with a ConstraintError, before any join', async () => {
        const offender = asContent({
          repo: '.this',
          role: 'any',
          body: `a brief\n${BOOT_CACHE_BOUNDARY_LINE}\nmore\n`,
        });
        const error = await getError(() =>
          asBootCorpusWithCacheBoundary({
            published: [PUBLISHED],
            local: [offender],
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain(
          'a role boot holds the cache boundary literal',
        );
      });
    });
  });
});
