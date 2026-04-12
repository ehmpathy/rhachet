import type { KeyrackHostManifest } from '@src/domain.objects/keyrack';

import { asKeyrackKeyEnv } from './asKeyrackKeyEnv';
import { asKeyrackKeyName } from './asKeyrackKeyName';

/**
 * .what = get all sudo slugs that match a key input
 * .why = encapsulates sudo key lookup logic from unlock orchestrator
 *
 * .note = matches by full slug or key name suffix
 * .note = only returns slugs where env=sudo
 */
export const getAllSudoSlugsForKey = (input: {
  hostManifest: KeyrackHostManifest;
  keyInput: string;
}): string[] => {
  const { hostManifest, keyInput } = input;

  // detect if keyInput is a full slug (org.env.key format) or just key name
  const isFullSlug = keyInput.includes('.') && hostManifest.hosts[keyInput];

  return Object.entries(hostManifest.hosts)
    .filter(([slug]) => {
      // slug format: $org.$env.$key (key may contain dots)
      const slugEnv = asKeyrackKeyEnv({ slug });
      const slugKey = asKeyrackKeyName({ slug });

      // if full slug provided, match exactly
      if (isFullSlug) {
        return slug === keyInput && slugEnv === 'sudo';
      }

      // otherwise match by key name suffix
      return slugEnv === 'sudo' && slugKey === keyInput;
    })
    .map(([slug]) => slug);
};
