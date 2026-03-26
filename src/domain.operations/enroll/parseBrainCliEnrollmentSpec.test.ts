import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { parseBrainCliEnrollmentSpec } from './parseBrainCliEnrollmentSpec';

describe('parseBrainCliEnrollmentSpec', () => {
  given('[case1] replace mode with single role', () => {
    when('[t0] spec is "mechanic"', () => {
      then('returns replace mode with add mechanic', () => {
        const result = parseBrainCliEnrollmentSpec({ spec: 'mechanic' });
        expect(result.mode).toEqual('replace');
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0]).toMatchObject({
          action: 'add',
          role: 'mechanic',
        });
      });
    });
  });

  given('[case2] replace mode with multiple roles', () => {
    when('[t0] spec is "mechanic,ergonomist"', () => {
      then('returns replace mode with both roles', () => {
        const result = parseBrainCliEnrollmentSpec({
          spec: 'mechanic,ergonomist',
        });
        expect(result.mode).toEqual('replace');
        expect(result.ops).toHaveLength(2);
        expect(result.ops[0]).toMatchObject({
          action: 'add',
          role: 'mechanic',
        });
        expect(result.ops[1]).toMatchObject({
          action: 'add',
          role: 'ergonomist',
        });
      });
    });
  });

  given('[case3] delta mode with append', () => {
    when('[t0] spec is "+architect"', () => {
      then('returns delta mode with add architect', () => {
        const result = parseBrainCliEnrollmentSpec({ spec: '+architect' });
        expect(result.mode).toEqual('delta');
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0]).toMatchObject({
          action: 'add',
          role: 'architect',
        });
      });
    });
  });

  given('[case4] delta mode with subtract', () => {
    when('[t0] spec is "-driver"', () => {
      then('returns delta mode with remove driver', () => {
        const result = parseBrainCliEnrollmentSpec({ spec: '-driver' });
        expect(result.mode).toEqual('delta');
        expect(result.ops).toHaveLength(1);
        expect(result.ops[0]).toMatchObject({
          action: 'remove',
          role: 'driver',
        });
      });
    });
  });

  given('[case5] delta mode with mixed ops', () => {
    when('[t0] spec is "-driver,+architect"', () => {
      then('returns delta mode with both ops in order', () => {
        const result = parseBrainCliEnrollmentSpec({
          spec: '-driver,+architect',
        });
        expect(result.mode).toEqual('delta');
        expect(result.ops).toHaveLength(2);
        expect(result.ops[0]).toMatchObject({
          action: 'remove',
          role: 'driver',
        });
        expect(result.ops[1]).toMatchObject({
          action: 'add',
          role: 'architect',
        });
      });
    });
  });

  given('[case6] spec with whitespace', () => {
    when('[t0] spec is " mechanic , ergonomist "', () => {
      then('trims and parses correctly', () => {
        const result = parseBrainCliEnrollmentSpec({
          spec: ' mechanic , ergonomist ',
        });
        expect(result.mode).toEqual('replace');
        expect(result.ops).toHaveLength(2);
        expect(result.ops[0]).toMatchObject({
          action: 'add',
          role: 'mechanic',
        });
        expect(result.ops[1]).toMatchObject({
          action: 'add',
          role: 'ergonomist',
        });
      });
    });
  });

  given('[case7] empty spec', () => {
    when('[t0] spec is ""', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          parseBrainCliEnrollmentSpec({ spec: '' }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('empty');
      });
    });

    when('[t1] spec is "   "', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          parseBrainCliEnrollmentSpec({ spec: '   ' }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('empty');
      });
    });
  });

  given('[case8] conflict in ops', () => {
    when('[t0] spec is "+mechanic,-mechanic"', () => {
      then('throws BadRequestError about conflict', async () => {
        const error = await getError(() =>
          parseBrainCliEnrollmentSpec({ spec: '+mechanic,-mechanic' }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain(
          "cannot both add and remove 'mechanic'",
        );
      });
    });
  });

  given('[case9] empty role after prefix', () => {
    when('[t0] spec is "+"', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          parseBrainCliEnrollmentSpec({ spec: '+' }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('cannot be empty');
      });
    });

    when('[t1] spec is "-"', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          parseBrainCliEnrollmentSpec({ spec: '-' }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('cannot be empty');
      });
    });
  });

  given('[case10] mixed bare and prefixed roles', () => {
    when('[t0] spec is "mechanic,+architect"', () => {
      then('throws BadRequestError about delta mode', async () => {
        const error = await getError(() =>
          parseBrainCliEnrollmentSpec({ spec: 'mechanic,+architect' }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('delta mode');
      });
    });
  });
});
