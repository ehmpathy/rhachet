import { ConstraintError } from 'helpful-errors';

import type { RoleBootSpec } from '@src/domain.objects/RoleBootSpec';

import { statSync } from 'node:fs';
import { parseRoleBootYaml } from './parseRoleBootYaml';
import { readOneBootSpecFile } from './readOneBootSpecFile';

/**
 * .what = the boot spec at one path, or the parse fault its author must repair
 * .why = the one lenient spec read. every reader before or beside a render composes on it, so
 *        a spec the author broke (bad yaml, a mixed mode, a stray `of:`) never halts a clone
 *        birth or the rerender that repairs it (`rule.forbid.content-checks-that-halt-enroll`)
 *
 * .note = `{ spec: null, fault: null }` where no spec is on disk, or its content is empty
 * .note = only the parse is set aside. a spec that vanished between probe and read, or one the
 *   os refuses to read, raises from `readOneBootSpecFile` — those are no content fault, and the
 *   probe's `throwIfNoEntry: false` keeps an unreadable spec loud
 */
export const getOneRoleBootSpecOrFaultFromPath = (input: {
  pathToSpec: string;
}): { spec: RoleBootSpec | null; fault: ConstraintError | null } => {
  if (!statSync(input.pathToSpec, { throwIfNoEntry: false }))
    return { spec: null, fault: null };
  const content = readOneBootSpecFile({ pathToSpec: input.pathToSpec });

  // parse the spec; a refusal of the content is the author's to repair, so it is returned
  try {
    return {
      spec: parseRoleBootYaml({ content, path: input.pathToSpec }),
      fault: null,
    };
  } catch (error) {
    if (!(error instanceof ConstraintError)) throw error;
    return { spec: null, fault: error };
  }
};
