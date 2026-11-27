import type { KeyrackKeyHost } from '@src/domain.objects/keyrack';

/**
 * .what = the host records with one address dropped; null when the address is absent
 * .why = a manifest mutation reads as narrative, and null tells the writer there is naught to write
 */
export const asKeyrackKeyHostsWithout = (input: {
  hosts: Record<string, KeyrackKeyHost>;
  address: string;
}): Record<string, KeyrackKeyHost> | null => {
  // absent already: no write owed
  if (!input.hosts[input.address]) return null;

  // every record but the one at this address
  const { [input.address]: _dropped, ...hostsKept } = input.hosts;
  return hostsKept;
};
