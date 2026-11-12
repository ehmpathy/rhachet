import { REPO_ACTOR_DIR_NAME_LEGACY } from '@src/domain.operations/actor/enrolled/constants';
import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';

import { readlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * .what = whether `<repo>/.claude` is a link aimed at the legacy repo actor brain dir
 * .why = rhachet's own prior link, dangled by the rename; the layout step repoints it, so the
 *   preflight must pass it
 */
export const isRepoBrainDirSymlinkLegacy = (input: {
  repoPath: string;
  linkPath: string;
}): boolean =>
  resolve(input.repoPath, readlinkSync(input.linkPath)) ===
  getBrainOndiskDir({
    actorDir: join(
      getActorsRootDir({ repoPath: input.repoPath }),
      REPO_ACTOR_DIR_NAME_LEGACY,
    ),
  });
