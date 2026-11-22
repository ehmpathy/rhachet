import { MalfunctionError } from 'helpful-errors';

import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { asBootCorpus } from './asBootCorpus';
import type { BootStats } from './BootStats';
import {
  BOOT_CACHE_BOUNDARY_LINE,
  getOneBootCacheBoundary,
} from './getOneBootCacheBoundary';
import { getOneRhachetBootIntro } from './getOneRhachetBootIntro';

/**
 * .what = join the rendered roles into one boot corpus: the intro, the published roles, the
 *   boundary line, then the `repo=.this` roles
 * .why = the boundary's two duties live in one pure function: place the line once between the
 *   two groups, and prove the joined corpus holds it exactly as many times as wanted
 * .note = no local tail, no boundary: a corpus of published roles alone is one stable block
 * .note = a role file's own copy of the literal never reaches here: the role render defangs it
 *   (`asBootSayResourcesDefanged`), so a copy found by the count check is the render's own fault
 */
export const asBootCorpusWithCacheBoundary = (input: {
  published: { ref: RoleLinkRef; body: string; stats: BootStats }[];
  local: { ref: RoleLinkRef; body: string; stats: BootStats }[];
}): { body: string; stats: BootStats } => {
  // the rhachet intro leads; the boundary line parts the stable prefix from the local tail
  const isLocalTailPresent = input.local.length > 0;
  const corpus = asBootCorpus({
    contents: [
      getOneRhachetBootIntro(),
      ...input.published,
      ...(isLocalTailPresent ? [getOneBootCacheBoundary()] : []),
      ...input.local,
    ],
  });

  // the corpus holds the boundary once when a local tail exists, else never
  const boundaryCountFound = corpus.body
    .split('\n')
    .filter((line) => line === BOOT_CACHE_BOUNDARY_LINE).length;
  const boundaryCountWanted = isLocalTailPresent ? 1 : 0;
  if (boundaryCountFound !== boundaryCountWanted)
    throw new MalfunctionError(
      'the boot corpus holds the boundary a wrong number of times',
      { boundaryCountFound, boundaryCountWanted },
    );

  return corpus;
};
