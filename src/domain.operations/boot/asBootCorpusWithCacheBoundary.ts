import { MalfunctionError } from 'helpful-errors';

import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { asBootCorpus } from './asBootCorpus';
import { assertRoleBootsFreeOfCacheBoundary } from './assertRoleBootsFreeOfCacheBoundary';
import type { BootStats } from './BootStats';
import {
  BOOT_CACHE_BOUNDARY_LINE,
  getOneBootCacheBoundary,
} from './getOneBootCacheBoundary';
import { getOneRhachetBootIntro } from './getOneRhachetBootIntro';

/**
 * .what = join the rendered roles into one boot corpus: the intro, the published roles, the
 *   boundary line, then the `repo=.this` roles
 * .why = the boundary's three duties live in one pure function: refuse a role body that holds
 *   the literal, place the line once between the two groups, and prove the joined corpus holds
 *   it exactly as many times as wanted
 * .note = no local tail, no boundary: a corpus of published roles alone is one stable block
 */
export const asBootCorpusWithCacheBoundary = (input: {
  published: { ref: RoleLinkRef; body: string; stats: BootStats }[];
  local: { ref: RoleLinkRef; body: string; stats: BootStats }[];
}): { body: string; stats: BootStats } => {
  // refuse a role body that holds the boundary line
  assertRoleBootsFreeOfCacheBoundary({
    roles: [...input.published, ...input.local],
  });

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
