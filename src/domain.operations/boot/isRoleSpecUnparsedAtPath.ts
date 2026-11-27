import { asRoleDirCoordinates } from '@src/domain.operations/mods/asRoleDirCoordinates';
import { getOneRoleBootSpecOrFaultFromPath } from '@src/domain.operations/role/getOneRoleBootSpecOrFaultFromPath';

import { dirname } from 'node:path';

/**
 * .what = whether a spec path is a role's own `boot.yml` that will not parse
 * .why = such a spec is a content defect the content scan names, with the parser's line, on
 *        every arm the cost sweep runs on (the stop and the roster). the sweep stays silent on
 *        it, so one fault is reported once
 *
 * .note = a path outside `.agent/repo=*\/role=*` (a route manifest) is never a role spec
 */
export const isRoleSpecUnparsedAtPath = (input: {
  pathToSpec: string;
}): boolean => {
  if (!asRoleDirCoordinates({ roleDir: dirname(input.pathToSpec) }))
    return false;
  return (
    getOneRoleBootSpecOrFaultFromPath({ pathToSpec: input.pathToSpec })
      .fault !== null
  );
};
