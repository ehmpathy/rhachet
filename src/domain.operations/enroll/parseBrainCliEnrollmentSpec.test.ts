import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { parseBrainCliEnrollmentSpec } from './parseBrainCliEnrollmentSpec';

/**
 * .what = unit tests for the enroll spec builder over the shared `--roles` grammar
 * .why = enroll shares `getRoleDeltas`; this proves the builder pairs the parsed
 *        deltas with the derived mode correctly (absolute vs incremental). (both-form
 *        flatten is proven in getRoleDeltaTokens.test.ts, upstream of here.)
 */
describe('parseBrainCliEnrollmentSpec', () => {
  given('[case1] a single bare role', () => {
    when('[t0] tokens = ["mechanic"]', () => {
      then('returns absolute mode with an absolute mechanic delta', () => {
        const result = parseBrainCliEnrollmentSpec({ tokens: ['mechanic'] });
        expect(result.mode).toEqual('absolute');
        expect(result.deltas).toHaveLength(1);
        expect(result.deltas[0]).toMatchObject({
          kind: 'absolute',
          role: 'mechanic',
        });
      });
    });
  });

  given('[case2] multiple bare roles', () => {
    when('[t0] tokens = ["mechanic","ergonomist"]', () => {
      then('returns absolute mode with both roles', () => {
        const result = parseBrainCliEnrollmentSpec({
          tokens: ['mechanic', 'ergonomist'],
        });
        expect(result.mode).toEqual('absolute');
        expect(result.deltas).toHaveLength(2);
        expect(result.deltas.map((delta) => delta.role)).toEqual([
          'mechanic',
          'ergonomist',
        ]);
        expect(
          result.deltas.every((delta) => delta.kind === 'absolute'),
        ).toEqual(true);
      });
    });
  });

  given('[case3] delta add', () => {
    when('[t0] tokens = ["+architect"]', () => {
      then('returns incremental mode with an addition architect delta', () => {
        const result = parseBrainCliEnrollmentSpec({ tokens: ['+architect'] });
        expect(result.mode).toEqual('incremental');
        expect(result.deltas).toHaveLength(1);
        expect(result.deltas[0]).toMatchObject({
          kind: 'addition',
          role: 'architect',
        });
      });
    });
  });

  given('[case4] delta remove (the regression)', () => {
    when('[t0] tokens = ["-driver"]', () => {
      then('returns incremental mode with a subtraction driver delta', () => {
        const result = parseBrainCliEnrollmentSpec({ tokens: ['-driver'] });
        expect(result.mode).toEqual('incremental');
        expect(result.deltas).toHaveLength(1);
        expect(result.deltas[0]).toMatchObject({
          kind: 'subtraction',
          role: 'driver',
        });
      });
    });
  });

  given('[case5] delta mixed add + remove', () => {
    when('[t0] tokens = ["-driver","+architect"]', () => {
      then('returns incremental with both deltas', () => {
        const result = parseBrainCliEnrollmentSpec({
          tokens: ['-driver', '+architect'],
        });
        expect(result.mode).toEqual('incremental');
        expect(result.deltas).toHaveLength(2);
        const removeDelta = result.deltas.find(
          (delta) => delta.kind === 'subtraction',
        );
        const addDelta = result.deltas.find(
          (delta) => delta.kind === 'addition',
        );
        expect(removeDelta?.role).toEqual('driver');
        expect(addDelta?.role).toEqual('architect');
      });
    });
  });

  given('[case6] duplicate delta tokens', () => {
    when('[t0] tokens = ["+architect","+architect"]', () => {
      then('dedupes to a single addition delta', () => {
        const result = parseBrainCliEnrollmentSpec({
          tokens: ['+architect', '+architect'],
        });
        expect(result.mode).toEqual('incremental');
        expect(result.deltas).toHaveLength(1);
      });
    });
  });

  given('[case7] empty token list', () => {
    when('[t0] tokens = []', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          parseBrainCliEnrollmentSpec({ tokens: [] }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
      });
    });
  });

  given('[case8] add and remove conflict', () => {
    when('[t0] tokens = ["+mechanic","-mechanic"]', () => {
      then('throws BadRequestError about contradiction', async () => {
        const error = await getError(() =>
          parseBrainCliEnrollmentSpec({ tokens: ['+mechanic', '-mechanic'] }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('add and remove');
      });
    });
  });

  given('[case9] empty role after a sigil', () => {
    when('[t0] tokens = ["+"]', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          parseBrainCliEnrollmentSpec({ tokens: ['+'] }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('empty');
      });
    });
  });

  given('[case10] mixed bare and sigiled tokens', () => {
    when('[t0] tokens = ["mechanic","+architect"]', () => {
      then('throws BadRequestError about mixed call', async () => {
        const error = await getError(() =>
          parseBrainCliEnrollmentSpec({ tokens: ['mechanic', '+architect'] }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('mix');
      });
    });
  });
});
