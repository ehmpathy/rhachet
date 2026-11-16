import type { BrainAuthUsage } from '@src/domain.objects/BrainAuthUsage';

/**
 * .what = the json envelope of `rhx brains auth get --output json`
 * .why = the pool rotation (#575) parses this shape, so it is named and snapped in one place
 * .note = never holds a token: each row is the usage domain object, which holds none
 */
export const asBrainAuthUsageJson = (input: {
  usages: BrainAuthUsage[];
  owner: string;
}): { owner: string; accounts: BrainAuthUsage[] } => ({
  owner: input.owner,
  accounts: input.usages,
});
