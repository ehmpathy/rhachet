import { INCREMENTAL_REMOVE_SENTINEL } from './getPreprocessedRoleArgv';

/**
 * .what = decodes a sentinel-marked token back into a `-role` remove token
 * .why = getRoleDeltas expects the natural `-role` form; the shared
 *        tokenizer `getRoleDeltaTokens` calls this on each raw `--roles` value
 *        before split + classification (so every command decodes uniformly)
 */
export const getDecodedRoleDeltaToken = (input: { token: string }): string =>
  input.token.startsWith(INCREMENTAL_REMOVE_SENTINEL)
    ? `-${input.token.slice(INCREMENTAL_REMOVE_SENTINEL.length)}`
    : input.token;
