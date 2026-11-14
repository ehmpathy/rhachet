import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';
import { withAbsentAsNull } from '@src/infra/withAbsentAsNull';

import { readdirSync } from 'node:fs';
import { asActorOndiskExidFromDirName } from './asActorOndiskExidFromDirName';
import { getActorsRootDir } from './getActorsRootDir';

/**
 * .what = the exid of every actor dir on disk, read from the dir names alone, low→high
 * .why = a report that names which actor dirs exist need not parse each `actor.json`; a dir
 *        name read cannot fail on a corrupt record, so the report never halts init
 *
 * .note = the actors root absent → none enrolled yet → []
 * .note = a dir whose name is not an actor token is skipped, as `getAllActorsOndisk` skips it
 */
export const getAllActorExidsOndisk = (input: {
  repoPath: string;
}): string[] => {
  const actorsRoot = getActorsRootDir({
    repoPath: getOneRepoPath({ from: input.repoPath }),
  });

  // no actors root → none enrolled yet
  const entries = withAbsentAsNull({
    read: () => readdirSync(actorsRoot, { withFileTypes: true }),
  });
  if (!entries) return [];

  // one exid per actor dir; a non-actor entry yields none
  return entries
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const exid = asActorOndiskExidFromDirName({ dirName: entry.name });
      return exid === null ? [] : [exid];
    })
    .sort();
};
