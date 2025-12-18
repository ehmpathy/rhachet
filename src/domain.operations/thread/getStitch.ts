import type { Stitch } from '@src/domain.objects';

/**
 * .what = gets the latest stitch from a thread, optionally filtered
 * .why = needed to retrieve the most recent relevant operation or result
 */
export const getStitch = <TOutput = unknown>(input: {
  from: Stitch<any>[];
  where?: (s: Stitch<any>) => s is Stitch<TOutput>;
  order?: 'DESC';
  limit?: 1;
}): Stitch<TOutput> | null => {
  const { from, where } = input;
  const order = input.order ?? 'DESC';

  if (!Array.isArray(from) || from.length === 0) return null;

  const list = order === 'DESC' ? [...from].reverse() : from;

  const match = where ? list.find(where) : list[0];

  return match ?? null;
};
