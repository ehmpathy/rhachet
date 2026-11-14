import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { join } from 'node:path';

/**
 * .what = the dir a linked role lives in: `<cwd>/.agent/repo=<repo>/role=<role>`
 * .why = every reader of a linked role computes this one path; one transformer owns its shape
 */
export const asRoleDir = (input: { cwd: string; ref: RoleLinkRef }): string =>
  join(input.cwd, '.agent', `repo=${input.ref.repo}`, `role=${input.ref.role}`);
