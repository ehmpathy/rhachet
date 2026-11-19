import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';

import { join } from 'node:path';
import { BRAIN_DIR_BOOT_FILENAMES } from './constants';

/**
 * .what = the path of an actor's current boot, the `boot.md` its brain dir renders
 * .why = one owner for the path the revision writer, the drift reader, and the fleet cache hash
 *        each read, so none joins it on its own
 */
export const getActorBootCurrentPath = (input: { actorDir: string }): string =>
  join(
    getBrainOndiskDir({ actorDir: input.actorDir }),
    BRAIN_DIR_BOOT_FILENAMES.bootMd,
  );
