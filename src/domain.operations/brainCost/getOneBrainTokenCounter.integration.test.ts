import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { calcBrainTokens } from './calcBrainTokens';
import {
  type BrainTokenCounter,
  getOneBrainTokenCounter,
} from './getOneBrainTokenCounter';
import { getOneBrainTokenMemoPath } from './getOneBrainTokenMemoPath';

/**
 * .what = a stand-in encoder that records how often it was loaded and asked
 * .why = the memo's whole claim is that a hit never reaches the encoder, so the test must see
 *        each load and each count rather than infer them from the output
 */
const genCountedLoad = () => {
  const calls = { loads: 0, counts: 0 };
  const load = (): BrainTokenCounter => {
    calls.loads += 1;
    return ({ of }) => {
      calls.counts += 1;
      return { chars: of.words.length, tokens: of.words.split(' ').length };
    };
  };
  return { calls, load };
};

/**
 * .what = a temp repo, with or without the `.agent` dir a memo needs
 */
const genRepo = (input: { slug: string; agent: boolean }): string => {
  const cwd = genTempDir({ slug: input.slug });
  if (input.agent) mkdirSync(join(cwd, '.agent'), { recursive: true });
  return cwd;
};

describe('getOneBrainTokenCounter', () => {
  given('[case1] a repo with an .agent dir, and no memo yet', () => {
    const cwd = genRepo({ slug: 'getOneBrainTokenCounter-c1', agent: true });

    when('[t0] a text is counted on a first run', () => {
      const result = useBeforeAll(async () => {
        const { calls, load } = genCountedLoad();
        const countTokens = await getOneBrainTokenCounter(
          { memo: { cwd } },
          { load },
        );
        const counted = countTokens({ of: { words: 'surf the north shore' } });
        return { calls, counted };
      });

      then('the encoder is loaded once and asked once', () => {
        expect(result.calls).toEqual({ loads: 1, counts: 1 });
      });

      then('the count is the encoder count', () => {
        expect(result.counted).toEqual({ chars: 20, tokens: 4 });
      });

      then('the memo is written under the self-ignored cache dir', () => {
        const path = getOneBrainTokenMemoPath({ cwd });
        expect(existsSync(path)).toBe(true);
        expect(Object.values(JSON.parse(readFileSync(path, 'utf-8')))).toEqual([
          4,
        ]);
        expect(existsSync(join(cwd, '.agent/.cache/.gitignore'))).toBe(true);
      });
    });

    when('[t1] the same text is counted on a second run', () => {
      const result = useBeforeAll(async () => {
        const { calls, load } = genCountedLoad();
        const countTokens = await getOneBrainTokenCounter(
          { memo: { cwd } },
          { load },
        );
        const counted = countTokens({ of: { words: 'surf the north shore' } });
        return { calls, counted };
      });

      then('the encoder is never loaded', () => {
        expect(result.calls).toEqual({ loads: 0, counts: 0 });
      });

      then('the count equals the first run', () => {
        expect(result.counted).toEqual({ chars: 20, tokens: 4 });
      });
    });

    when('[t2] a new text is counted beside the memoized one', () => {
      const result = useBeforeAll(async () => {
        const { calls, load } = genCountedLoad();
        const countTokens = await getOneBrainTokenCounter(
          { memo: { cwd } },
          { load },
        );
        const hit = countTokens({ of: { words: 'surf the north shore' } });
        const miss = countTokens({ of: { words: 'paddle out' } });
        return { calls, hit, miss };
      });

      then('only the new text reaches the encoder', () => {
        expect(result.calls).toEqual({ loads: 1, counts: 1 });
        expect(result.hit.tokens).toEqual(4);
        expect(result.miss.tokens).toEqual(2);
      });

      then('the memo now holds both counts', () => {
        const memo = JSON.parse(
          readFileSync(getOneBrainTokenMemoPath({ cwd }), 'utf-8'),
        );
        expect(Object.values(memo).sort()).toEqual([2, 4]);
      });
    });
  });

  given('[case2] a memo file that is malformed', () => {
    const cwd = genRepo({ slug: 'getOneBrainTokenCounter-c2', agent: true });
    beforeAll(() => {
      const path = getOneBrainTokenMemoPath({ cwd });
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, '{ torn');
    });

    when('[t0] a text is counted', () => {
      const result = useBeforeAll(async () => {
        const { calls, load } = genCountedLoad();
        const countTokens = await getOneBrainTokenCounter(
          { memo: { cwd } },
          { load },
        );
        const counted = countTokens({ of: { words: 'a wave' } });
        return { calls, counted };
      });

      then('the text is recounted rather than read from the torn file', () => {
        expect(result.calls).toEqual({ loads: 1, counts: 1 });
        expect(result.counted.tokens).toEqual(2);
      });

      then('the memo is rewritten clean', () => {
        const memo = JSON.parse(
          readFileSync(getOneBrainTokenMemoPath({ cwd }), 'utf-8'),
        );
        expect(Object.values(memo)).toEqual([2]);
      });
    });
  });

  given('[case3] a cwd with no .agent dir', () => {
    const cwd = genRepo({ slug: 'getOneBrainTokenCounter-c3', agent: false });

    when('[t0] a text is counted', () => {
      const result = useBeforeAll(async () => {
        const { calls, load } = genCountedLoad();
        const countTokens = await getOneBrainTokenCounter(
          { memo: { cwd } },
          { load },
        );
        const counted = countTokens({ of: { words: 'a wave' } });
        return { calls, counted };
      });

      then('the encoder counts it', () => {
        expect(result.calls).toEqual({ loads: 1, counts: 1 });
        expect(result.counted.tokens).toEqual(2);
      });

      then('no .agent dir is sprouted to hold a memo', () => {
        expect(existsSync(join(cwd, '.agent'))).toBe(false);
      });
    });
  });

  given('[case4] no memo requested', () => {
    when('[t0] one text is counted twice', () => {
      const result = useBeforeAll(async () => {
        const { calls, load } = genCountedLoad();
        const countTokens = await getOneBrainTokenCounter(
          { memo: null },
          { load },
        );
        countTokens({ of: { words: 'a wave' } });
        countTokens({ of: { words: 'a wave' } });
        return { calls };
      });

      then('the encoder loads once and counts both times', () => {
        expect(result.calls).toEqual({ loads: 1, counts: 2 });
      });
    });
  });

  given('[case5] the real encoder', () => {
    const cwd = genRepo({ slug: 'getOneBrainTokenCounter-c5', agent: true });
    const words = 'the brain counts tokens, and the memo recalls them 🐢';

    when('[t0] a text is counted on a miss, then on a hit', () => {
      const result = useBeforeAll(async () => {
        const countMiss = await getOneBrainTokenCounter({ memo: { cwd } });
        const miss = countMiss({ of: { words } });
        const countHit = await getOneBrainTokenCounter({ memo: { cwd } });
        const hit = countHit({ of: { words } });
        return { miss, hit };
      });

      then('the memoized count equals the encoder count exactly', () => {
        const expected = calcBrainTokens({ of: { words } });
        expect(result.miss).toEqual(expected);
        expect(result.hit).toEqual(expected);
      });
    });
  });
});
