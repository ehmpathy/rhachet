import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';

import { join } from 'node:path';

/**
 * .what = the path of one boot's lead record: `<repo>/.agent/.actors/.boot.leads/<bootHash>.json`
 * .why = keyed by the boot's content, so two actors with one boot share a lead and two role sets
 *   never wait on each other. it sits beside `.locks/` under the gitignored actors root: run
 *   state, host-local, safe to delete
 */
export const getBootCacheLeadPath = (input: {
  repoPath: string;
  bootHash: string;
}): string =>
  join(
    getActorsRootDir({ repoPath: input.repoPath }),
    '.boot.leads',
    `${input.bootHash}.json`,
  );
