const SUFFIX_MIN = '.min';

/**
 * .what = the `.md` a `.md.min` minifies; any other path as it is
 * .why = a minification rides with its brief, so each reader of the pair asks the same question
 */
export const asBriefPathLessMin = (input: { path: string }): string =>
  input.path.endsWith(`.md${SUFFIX_MIN}`)
    ? input.path.slice(0, -SUFFIX_MIN.length)
    : input.path;
