import { given, then, when } from 'test-fns';

import { getHasGlobChars } from './getHasGlobChars';
import { getIsSlugMatch } from './getIsSlugMatch';

describe('getHasGlobChars', () => {
  const TEST_CASES = [
    { pattern: 'git.*', expected: true, description: 'asterisk' },
    { pattern: 'git.?', expected: true, description: 'question mark' },
    { pattern: 'git.[abc]', expected: true, description: 'brackets' },
    { pattern: 'radio', expected: false, description: 'plain text' },
    { pattern: 'git.commit.set', expected: false, description: 'dots only' },
  ];

  TEST_CASES.forEach((testCase) =>
    test(`detects ${testCase.description}: ${testCase.pattern}`, () => {
      expect(getHasGlobChars({ pattern: testCase.pattern })).toBe(
        testCase.expected,
      );
    }),
  );
});

describe('getIsSlugMatch', () => {
  given('[case1] glob patterns', () => {
    when('[t0] pattern matches slug', () => {
      then('returns true for git.* vs git.commit', () => {
        expect(getIsSlugMatch({ slug: 'git.commit', pattern: 'git.*' })).toBe(
          true,
        );
      });

      then('returns true for *.push vs git.commit.push', () => {
        expect(
          getIsSlugMatch({ slug: 'git.commit.push', pattern: '*.push' }),
        ).toBe(true);
      });
    });

    when('[t1] pattern does not match slug', () => {
      then('returns false for git.* vs radio.task', () => {
        expect(getIsSlugMatch({ slug: 'radio.task', pattern: 'git.*' })).toBe(
          false,
        );
      });
    });
  });

  given('[case2] contains patterns', () => {
    when('[t0] pattern is contained in slug', () => {
      then('returns true for radio in radio.task.push', () => {
        expect(
          getIsSlugMatch({ slug: 'radio.task.push', pattern: 'radio' }),
        ).toBe(true);
      });

      then('returns true for commit in git.commit.set', () => {
        expect(
          getIsSlugMatch({ slug: 'git.commit.set', pattern: 'commit' }),
        ).toBe(true);
      });
    });

    when('[t1] pattern is not contained in slug', () => {
      then('returns false for radio in git.commit', () => {
        expect(getIsSlugMatch({ slug: 'git.commit', pattern: 'radio' })).toBe(
          false,
        );
      });
    });
  });

  given('[case3] edge cases', () => {
    when('[t0] pattern is null', () => {
      then('returns true (match all)', () => {
        expect(getIsSlugMatch({ slug: 'any.skill', pattern: null })).toBe(true);
      });
    });

    when('[t1] slug is empty', () => {
      then('returns false', () => {
        expect(getIsSlugMatch({ slug: '', pattern: 'radio' })).toBe(false);
      });
    });

    when('[t2] pattern is empty string', () => {
      then('returns true (match all)', () => {
        expect(getIsSlugMatch({ slug: 'any.skill', pattern: '' })).toBe(true);
      });
    });
  });
});
