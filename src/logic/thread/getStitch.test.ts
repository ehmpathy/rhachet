import type { Stitch } from '../../domain/objects';
import { getStitch } from './getStitch';

describe('getStitch', () => {
  const makeStitch = <T = unknown>(input: {
    input: string;
    output: T;
  }): Stitch<T> => input as Stitch<T>;

  it('returns null for empty array', () => {
    const result = getStitch({ from: [] });
    expect(result).toBeNull();
  });

  it('returns the last stitch if order is not set and no filter is provided', () => {
    const stitches = [
      makeStitch({ input: 'a', output: 'first' }),
      makeStitch({ input: 'b', output: 'second' }),
      makeStitch({ input: 'c', output: 'third' }),
    ];

    const result = getStitch({ from: stitches });
    expect(result?.output).toBe('third');
  });

  it('returns the last matching stitch with DESC order and predicate', () => {
    const stitches = [
      makeStitch({ input: 'x', output: { form: 'A', value: 1 } }),
      makeStitch({ input: 'y', output: { form: 'B', value: 2 } }),
      makeStitch({ input: 'z', output: { form: 'A', value: 3 } }),
    ];

    const result = getStitch({
      from: stitches,
      order: 'DESC',
      where: (s): s is Stitch<{ form: 'A'; value: number }> =>
        s.output.form === 'A',
    });

    expect(result?.output.form).toBe('A');
    expect(result?.output.value).toBe(3); // latest A
  });

  it('returns null if no stitch matches the predicate', () => {
    const stitches = [
      makeStitch({ input: 'x', output: { form: 'X' } }),
      makeStitch({ input: 'y', output: { form: 'Y' } }),
    ];

    const result = getStitch({
      from: stitches,
      where: (s): s is Stitch<{ form: 'Z' }> => s.output.form === 'Z',
    });

    expect(result).toBeNull();
  });

  it('raises a type error if the predicate type is incorrect', () => {
    const stitches = [
      makeStitch({ input: 'x', output: { form: 'X' } }),
      makeStitch({ input: 'y', output: { yarn: 'Y' } }),
    ];

    const result = getStitch({
      from: stitches,
      where: (s): s is Stitch<{ form: string }> => s.output.form,
    });

    // should resolve the type correctly
    expect(result!.output.form);

    // @ts-expect-error: Type 'string' is not assignable to type 'number'.
    const check: number = result!.output.form;
    expect(check);

    // @ts-expect-error: Property 'yarn' does not exist on type 'Stitch<{ form: string; }>'.ts(2339)
    expect(result!.output.yarn);
  });

  it('raises a type error if the predicate is not a type guard', () => {
    const stitches = [
      makeStitch({ input: 'a', output: 'foo' }),
      makeStitch({ input: 'b', output: 'bar' }),
    ];

    getStitch({
      from: stitches,
      // @ts-expect-error - predicate must return a type guard, not boolean
      where: (s) => typeof s.output === 'string',
    });
  });
});
