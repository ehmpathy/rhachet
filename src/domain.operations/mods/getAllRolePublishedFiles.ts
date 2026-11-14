import type { RoleModdedViewSource } from '@src/domain.objects/RoleModdedViewRecord';
import { asPathRelPosix } from '@src/infra/filesystem/asPathRelPosix';
import { getAllFilesFromDir } from '@src/infra/filesystem/getAllFilesFromDir';

import { posix, resolve } from 'node:path';

/**
 * .what = every file the sources of one kind publish, as `[role-relative key, file]` pairs
 * .why = a kind's files are the union over its sources; naming the step lets the caller read
 *        as a union of kinds
 */
const getAllSourceFilesOfKind = (input: {
  roleDir: string;
  kind: 'briefs' | 'skills';
  sources: RoleModdedViewSource[];
}): (readonly [string, string])[] =>
  input.sources.flatMap((source) => {
    const targetAbs = resolve(input.roleDir, source.target);
    return getAllFilesFromDir({ dir: targetAbs }).map(
      (file) =>
        [
          posix.join(
            input.kind,
            source.at,
            asPathRelPosix({ from: targetAbs, to: file }),
          ),
          file,
        ] as const,
    );
  });

/**
 * .what = every file a role publishes, keyed by its role-relative path
 * .why = the plan keys a mod on the path relative to the role dir (F1); the value is the
 *        published file each view link points at
 *
 * .note = walked through the source's own path, so each value names the package, never the
 *   store realpath
 */
export const getAllRolePublishedFiles = (input: {
  roleDir: string;
  sources: {
    briefs: RoleModdedViewSource[];
    skills: RoleModdedViewSource[];
  };
}): Map<string, string> =>
  new Map([
    ...getAllSourceFilesOfKind({
      roleDir: input.roleDir,
      kind: 'briefs',
      sources: input.sources.briefs,
    }),
    ...getAllSourceFilesOfKind({
      roleDir: input.roleDir,
      kind: 'skills',
      sources: input.sources.skills,
    }),
  ]);
