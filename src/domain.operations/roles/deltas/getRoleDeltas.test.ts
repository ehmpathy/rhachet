import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { RoleDelta } from '@src/domain.objects/RoleDelta';

import { getRoleDeltas } from './getRoleDeltas';

describe('getRoleDeltas', () => {
  given('[case1] all-absolute tokens (e16 legacy form)', () => {
    when('[t0] called with bare role names', () => {
      then('returns absolute deltas for the full set', () => {
        const result = getRoleDeltas({
          tokens: ['mechanic', 'behaver'],
        });
        expect(result).toEqual([
          new RoleDelta({ kind: 'absolute', role: 'mechanic' }),
          new RoleDelta({ kind: 'absolute', role: 'behaver' }),
        ]);
      });
    });

    when('[t1] called with a single bare qualified role', () => {
      then('keeps the repo/role token intact', () => {
        const result = getRoleDeltas({
          tokens: ['ehmpathy/mechanic'],
        });
        expect(result).toEqual([
          new RoleDelta({ kind: 'absolute', role: 'ehmpathy/mechanic' }),
        ]);
      });
    });
  });

  given('[case2] all-incremental tokens', () => {
    when('[t0] called with a single addition', () => {
      then('returns one addition delta', () => {
        const result = getRoleDeltas({ tokens: ['+architect'] });
        expect(result).toEqual([
          new RoleDelta({ kind: 'addition', role: 'architect' }),
        ]);
      });
    });

    when('[t1] called with an addition and a subtraction', () => {
      then('returns an addition delta and a subtraction delta', () => {
        const result = getRoleDeltas({
          tokens: ['+architect', '-reviewer'],
        });
        expect(result).toEqual([
          new RoleDelta({ kind: 'addition', role: 'architect' }),
          new RoleDelta({ kind: 'subtraction', role: 'reviewer' }),
        ]);
      });
    });

    when('[t2] called with qualified incremental tokens (e10)', () => {
      then('keeps repo/role intact on both sigils', () => {
        const result = getRoleDeltas({
          tokens: ['+ehmpathy/architect', '-bhuild/reviewer'],
        });
        expect(result).toEqual([
          new RoleDelta({ kind: 'addition', role: 'ehmpathy/architect' }),
          new RoleDelta({ kind: 'subtraction', role: 'bhuild/reviewer' }),
        ]);
      });
    });
  });

  given('[case3] duplicate incremental tokens (e6)', () => {
    when('[t0] the same addition appears twice', () => {
      then('dedupes to a single addition delta', () => {
        const result = getRoleDeltas({
          tokens: ['+architect', '+architect'],
        });
        expect(result).toEqual([
          new RoleDelta({ kind: 'addition', role: 'architect' }),
        ]);
      });
    });
  });

  given('[case4] mixed absolute + incremental call (e3)', () => {
    when('[t0] a bare token appears alongside a sigiled token', () => {
      then('throws BadRequestError about mixed calls', async () => {
        const error = await getError(() =>
          getRoleDeltas({ tokens: ['mechanic', '+architect'] }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('cannot mix');
      });
    });
  });

  given('[case5] same slug added and removed (e7)', () => {
    when('[t0] `+architect -architect` in one call', () => {
      then('throws BadRequestError about contradiction', async () => {
        const error = await getError(() =>
          getRoleDeltas({ tokens: ['+architect', '-architect'] }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('both add and remove');
      });
    });
  });

  given(
    '[case5b] same slug added unqualified and removed qualified (e7)',
    () => {
      when('[t0] `+architect -ehmpathy/architect` in one call', () => {
        then(
          'throws — an unqualified add conflicts with any same-slug remove',
          async () => {
            const error = await getError(() =>
              getRoleDeltas({
                tokens: ['+architect', '-ehmpathy/architect'],
              }),
            );
            expect(error).toBeInstanceOf(BadRequestError);
            expect(error.message).toContain('both add and remove');
          },
        );
      });

      when('[t1] `+ehmpathy/architect -ehmpathy/architect` (same repo)', () => {
        then(
          'throws — same repo + slug is a direct contradiction',
          async () => {
            const error = await getError(() =>
              getRoleDeltas({
                tokens: ['+ehmpathy/architect', '-ehmpathy/architect'],
              }),
            );
            expect(error).toBeInstanceOf(BadRequestError);
            expect(error.message).toContain('both add and remove');
          },
        );
      });
    },
  );

  given(
    '[case5c] same slug across distinct repos is not a contradiction',
    () => {
      when('[t0] `+ehmpathy/architect -bhuild/architect`', () => {
        then(
          'returns incremental deltas — different repos, different roles',
          () => {
            const result = getRoleDeltas({
              tokens: ['+ehmpathy/architect', '-bhuild/architect'],
            });
            expect(result).toEqual([
              new RoleDelta({ kind: 'addition', role: 'ehmpathy/architect' }),
              new RoleDelta({ kind: 'subtraction', role: 'bhuild/architect' }),
            ]);
          },
        );
      });
    },
  );

  given('[case6] bare sigil with no role name (e9)', () => {
    when('[t0] a lone "+" token', () => {
      then('throws BadRequestError about empty after "+"', async () => {
        const error = await getError(() => getRoleDeltas({ tokens: ['+'] }));
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('empty after "+"');
      });
    });

    when('[t1] a lone "-" token', () => {
      then('throws BadRequestError about empty after "-"', async () => {
        const error = await getError(() => getRoleDeltas({ tokens: ['-'] }));
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('empty after "-"');
      });
    });
  });

  given('[case7] empty token list', () => {
    when('[t0] called with no tokens', () => {
      then('throws BadRequestError about no roles', async () => {
        const error = await getError(() => getRoleDeltas({ tokens: [] }));
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('no roles specified');
      });
    });
  });
});
