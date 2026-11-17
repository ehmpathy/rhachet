import { setFileAtomic } from '@src/infra/setFileAtomic';

import type { BootCacheLead } from './asBootCacheLeadDecision';

/**
 * .what = write one boot's lead record, whole
 * .why = a reader must never meet a half-written lead; `setFileAtomic` swaps the whole file at once
 *
 * .note = called within the repo mutex over the record's path, so two first says never both claim
 */
export const setBootCacheLead = (input: {
  path: string;
  lead: BootCacheLead;
}): void =>
  setFileAtomic({
    path: input.path,
    content: `${JSON.stringify(input.lead)}\n`,
  });
