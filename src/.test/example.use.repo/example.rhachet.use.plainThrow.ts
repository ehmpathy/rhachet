import type { RoleRegistry } from '@src/contract/sdk';

/**
 * .what = a `--config` fixture whose `getRoleRegistries` raises a plain, unclassified `Error`
 * .why = the specimen `invoke.unclassifiedThrow.integration.test.ts` `[case1]` needs
 * .note = its message occurs nowhere else in the repo
 */
export const getRoleRegistries = async (): Promise<RoleRegistry[]> => {
  throw new Error('a fixture config refused to load, by design');
};
