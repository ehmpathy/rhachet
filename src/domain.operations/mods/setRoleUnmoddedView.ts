import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleModdedViewSource } from '@src/domain.objects/RoleModdedViewRecord';
import { setRoleViewLinks } from '@src/domain.operations/invoke/link/setRoleViewLinks';
import { symlinkResourceDirectories } from '@src/domain.operations/invoke/link/symlinkResourceDirectories';

import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { asRoleModdedViewRecordPath } from './asRoleModdedViewRecordPath';
import { assertRoleKindDirLinksOnly } from './assertRoleKindDirLinksOnly';
import { setRoleKindDirSwapped } from './setRoleKindDirSwapped';

/**
 * .what = restore a role's per-dir links once its mod is gone, and drop the view record
 * .why = a deleted mod returns the role to its published form at the next render (usecase 7)
 *
 * .note = the links are made by `symlinkResourceDirectories`, the same call `roles link` makes,
 *   so the unmodded view equals the layout `roles link` leaves (F13)
 * .note = a kind with no source had no dir before the mod; its view dir is removed
 */
export const setRoleUnmoddedView = (
  input: {
    roleDir: string;
    sources: { briefs: RoleModdedViewSource[]; skills: RoleModdedViewSource[] };
  },
  context: ContextCli,
): void => {
  // refuse before any write, so a stray file leaves the role dir untouched
  for (const kind of ['briefs', 'skills'] as const)
    assertRoleKindDirLinksOnly({ kindDir: join(input.roleDir, kind) });

  for (const kind of ['briefs', 'skills'] as const) {
    const kindDir = join(input.roleDir, kind);
    const sources = input.sources[kind];

    // a single-dir link mounts the source as the kind dir itself, as `roles link` does; an
    //   array-dir link mounts each source as an entry at the record's `at`, so a source mounted
    //   under a name other than its basename comes back under that same name; a kind with no
    //   source builds naught, so its view dir leaves with no successor
    const sourceWhole = sources.find((source) => source.at === '');
    setRoleKindDirSwapped({
      kindDir,
      build: ({ dir }) => {
        if (sources.length === 0) return;
        if (sourceWhole) {
          symlinkResourceDirectories(
            {
              sourceDirs: { uri: join(input.roleDir, sourceWhole.target) },
              targetDir: dir,
              resourceName: kind,
            },
            context,
          );
          return;
        }
        setRoleViewLinks({
          dir,
          links: sources.map((source) => ({
            path: source.at,
            target: join(input.roleDir, source.target),
          })),
        });
      },
    });
  }
  rmSync(asRoleModdedViewRecordPath({ roleDir: input.roleDir }), {
    force: true,
  });
};
