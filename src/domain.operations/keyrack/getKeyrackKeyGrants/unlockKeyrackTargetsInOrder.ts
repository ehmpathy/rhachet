import type { KeyrackKeyOmission } from '@src/domain.objects/keyrack/KeyrackKeyOmission';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';

import { asKeyrackKeyEnv } from '../asKeyrackKeyEnv';
import { asKeyrackKeyName } from '../asKeyrackKeyName';
import { unlockKeyrackKeys } from '../session/unlockKeyrackKeys';

/**
 * .what = unlock each target at its own reach, one after another; return every omission the
 *         unlocks caught
 * .why = a lazy `get --unlock` must name a fault the unlock caught (a mint refusal, a lost
 *        egress) on the re-got attempt, so the omissions are kept, not dropped
 *
 * .note = sequential, never parallel: the context is shared, so the host manifest decrypts once
 *         and two unlocks never race on the daemon
 * .note = the env comes from each target's slug, never from the caller's ask
 */
export const unlockKeyrackTargetsInOrder = async (
  input: {
    owner: string | null;
    targets: { slug: string; reach: KeyrackKeyReach | undefined }[];
  },
  context: Parameters<typeof unlockKeyrackKeys>[1],
): Promise<KeyrackKeyOmission[]> => {
  // each step awaits the one before it, so the order holds
  const omissionsSeed = async (): Promise<KeyrackKeyOmission[]> => [];
  return input.targets.reduce(
    async (omissionsPriorPromise, target): Promise<KeyrackKeyOmission[]> => {
      const omissionsPrior = await omissionsPriorPromise;
      const unlocked = await unlockKeyrackKeys(
        {
          owner: input.owner,
          env: asKeyrackKeyEnv({ slug: target.slug }) || 'all',
          key: asKeyrackKeyName({ slug: target.slug }),
          reach: target.reach,
        },
        context,
      );
      return [...omissionsPrior, ...unlocked.omitted];
    },
    omissionsSeed(),
  );
};
