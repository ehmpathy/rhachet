import picomatch from 'picomatch';

import { getHasGlobChars } from './getHasGlobChars';

/**
 * .what = checks if a skill slug matches a search pattern
 * .why = enables both glob patterns (*.sh) and contains search (radio)
 */
export const getIsSlugMatch = (input: {
  slug: string;
  pattern: string | null;
}): boolean => {
  // no pattern = match all
  if (!input.pattern) return true;

  // empty slug = no match
  if (!input.slug) return false;

  // glob mode: use picomatch
  if (getHasGlobChars({ pattern: input.pattern })) {
    return picomatch.isMatch(input.slug, input.pattern);
  }

  // contains mode: text includes
  return input.slug.includes(input.pattern);
};
