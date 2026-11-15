import { type IsoTimeStamp, toMillisecondsSinceEpoch } from 'iso-time';

/**
 * .what = whether stamp `a` is at or before stamp `b`
 * .why = compared as instants, never as text: a stamp that ends `.500Z` sorts before
 *        the same second's `Z` as text, though it is later
 */
export const isIsoTimeStampAtOrBefore = (input: {
  a: IsoTimeStamp;
  b: IsoTimeStamp;
}): boolean =>
  toMillisecondsSinceEpoch(input.a) <= toMillisecondsSinceEpoch(input.b);
