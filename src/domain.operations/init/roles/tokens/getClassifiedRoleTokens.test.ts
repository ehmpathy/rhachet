import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { getClassifiedRoleTokens } from './getClassifiedRoleTokens';

describe('getClassifiedRoleTokens', () => {
  given('[case1] all-absolute tokens (e16 legacy form)', () => {
    when('[t0] called with bare role names', () => {
      then('returns absolute mode with the full set', () => {
        const result = getClassifiedRoleTokens({
          tokens: ['mechanic', 'behaver'],
        });
        expect(result).toEqual({
          mode: 'absolute',
          absolutes: ['mechanic', 'behaver'],
        });
      });
    });

    when('[t1] called with a single bare qualified role', () => {
      then('keeps the repo/role token intact', () => {
        const result = getClassifiedRoleTokens({
          tokens: ['ehmpathy/mechanic'],
        });
        expect(result).toEqual({
          mode: 'absolute',
          absolutes: ['ehmpathy/mechanic'],
        });
      });
    });
  });

  given('[case2] all-incremental tokens', () => {
    when('[t0] called with a single addition', () => {
      then('returns incremental mode with one addition', () => {
        const result = getClassifiedRoleTokens({ tokens: ['+architect'] });
        expect(result).toEqual({
          mode: 'incremental',
          additions: ['architect'],
          subtractions: [],
        });
      });
    });

    when('[t1] called with an addition and a subtraction', () => {
      then('splits into additions and subtractions', () => {
        const result = getClassifiedRoleTokens({
          tokens: ['+architect', '-reviewer'],
        });
        expect(result).toEqual({
          mode: 'incremental',
          additions: ['architect'],
          subtractions: ['reviewer'],
        });
      });
    });

    when('[t2] called with qualified incremental tokens (e10)', () => {
      then('keeps repo/role intact on both sigils', () => {
        const result = getClassifiedRoleTokens({
          tokens: ['+ehmpathy/architect', '-bhuild/reviewer'],
        });
        expect(result).toEqual({
          mode: 'incremental',
          additions: ['ehmpathy/architect'],
          subtractions: ['bhuild/reviewer'],
        });
      });
    });
  });

  given('[case3] duplicate incremental tokens (e6)', () => {
    when('[t0] the same addition appears twice', () => {
      then('dedupes to a single addition', () => {
        const result = getClassifiedRoleTokens({
          tokens: ['+architect', '+architect'],
        });
        expect(result).toEqual({
          mode: 'incremental',
          additions: ['architect'],
          subtractions: [],
        });
      });
    });
  });

  given('[case4] mixed absolute + incremental call (e3)', () => {
    when('[t0] a bare token appears alongside a sigiled token', () => {
      then('throws BadRequestError about mixed calls', async () => {
        const error = await getError(() =>
          getClassifiedRoleTokens({ tokens: ['mechanic', '+architect'] }),
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
          getClassifiedRoleTokens({ tokens: ['+architect', '-architect'] }),
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
              getClassifiedRoleTokens({
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
              getClassifiedRoleTokens({
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
          'classifies as incremental — different repos, different roles',
          () => {
            const result = getClassifiedRoleTokens({
              tokens: ['+ehmpathy/architect', '-bhuild/architect'],
            });
            expect(result).toEqual({
              mode: 'incremental',
              additions: ['ehmpathy/architect'],
              subtractions: ['bhuild/architect'],
            });
          },
        );
      });
    },
  );

  given('[case6] bare sigil with no role name (e9)', () => {
    when('[t0] a lone "+" token', () => {
      then('throws BadRequestError about empty after "+"', async () => {
        const error = await getError(() =>
          getClassifiedRoleTokens({ tokens: ['+'] }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('empty after "+"');
      });
    });

    when('[t1] a lone "-" token', () => {
      then('throws BadRequestError about empty after "-"', async () => {
        const error = await getError(() =>
          getClassifiedRoleTokens({ tokens: ['-'] }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('empty after "-"');
      });
    });
  });

  given('[case7] empty token list', () => {
    when('[t0] called with no tokens', () => {
      then('throws BadRequestError about no roles', async () => {
        const error = await getError(() =>
          getClassifiedRoleTokens({ tokens: [] }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('no roles specified');
      });
    });
  });
});
