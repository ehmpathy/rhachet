import { createHash } from 'node:crypto';

/**
 * .what = the content address of one text, as the token memo keys it
 * .why = a token count is a pure function of the text, so the text's digest is a complete
 *        key — two texts that share a digest share a count, and no other input matters
 */
export const asBrainTokenMemoKey = (input: { words: string }): string =>
  createHash('sha256').update(input.words).digest('hex');
