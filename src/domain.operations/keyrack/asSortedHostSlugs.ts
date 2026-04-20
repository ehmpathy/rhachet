import type { KeyrackHostManifest } from '@src/domain.objects/keyrack';

/**
 * .what = extract and sort slug keys from host manifest hosts
 * .why = orchestrators should read as narrative; this names the operation
 */
export const asSortedHostSlugs = (input: {
  hosts: KeyrackHostManifest['hosts'];
}): string[] => {
  return Object.keys(input.hosts).sort();
};
