/**
 * .what = a value as a plain record, or null when it is not one (null, an array, a scalar)
 * .why = a parsed json value is `unknown`; each reader narrows it to a record the same way,
 *        with no cast, so the three callers agree on what an object is
 *
 * .note = the record is rebuilt from its own entries, so the result is typed without a cast
 */
export const asRecordOrNull = (input: {
  value: unknown;
}): Record<string, unknown> | null => {
  if (!input.value || typeof input.value !== 'object') return null;
  if (Array.isArray(input.value)) return null;
  return Object.fromEntries(Object.entries(input.value));
};
