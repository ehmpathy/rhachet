import { INCREMENTAL_REMOVE_SENTINEL } from './getPreprocessedRoleArgv';

/**
 * .what = decodes a sentinel-marked token back into a `-role` remove token
 * .why = getClassifiedRoleTokens expects the natural `-role` form; the CLI action
 *        calls this on each collected `--roles` value before classification
 */
export const getDecodedRoleToken = (input: { token: string }): string =>
  input.token.startsWith(INCREMENTAL_REMOVE_SENTINEL)
    ? `-${input.token.slice(INCREMENTAL_REMOVE_SENTINEL.length)}`
    : input.token;
