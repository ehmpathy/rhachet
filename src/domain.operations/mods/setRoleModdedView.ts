import {
  type RoleModdedViewHookBasis,
  RoleModdedViewRecord,
  type RoleModdedViewSource,
} from '@src/domain.objects/RoleModdedViewRecord';
import { setRoleViewLinks } from '@src/domain.operations/invoke/link/setRoleViewLinks';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { join } from 'node:path';
import { asRoleModdedViewRecordPath } from './asRoleModdedViewRecordPath';
import { assertRoleKindDirLinksOnly } from './assertRoleKindDirLinksOnly';
import { setRoleKindDirSwapped } from './setRoleKindDirSwapped';

/**
 * .what = turn a role's briefs/ and skills/ into real dirs of per-file links, as the plan says
 * .why = every reader of the role dir then sees the modded role, with no mod logic of its own
 *        (F8 b); a shadow skill sits beside its published peers, so it still finds them
 *
 * .note = idempotent: the kind dirs are rebuilt from the links whole, and the record rewritten
 * .note = a kind with no source and no mod file is left as it is
 * .note = both kind dirs are checked before any write, so a stray file refuses the swap with
 *   the role dir untouched; the record is written next, before the first removal, so a swap
 *   cut short still names its published sources, and the boot reads it as a stale view
 */
export const setRoleModdedView = (input: {
  roleDir: string;
  sources: { briefs: RoleModdedViewSource[]; skills: RoleModdedViewSource[] };
  links: Map<string, string>;
  hookBasis: RoleModdedViewHookBasis | null;
}): void => {
  // refuse before any write
  for (const kind of ['briefs', 'skills'] as const)
    assertRoleKindDirLinksOnly({ kindDir: join(input.roleDir, kind) });

  // the record keeps the sources the per-dir links named, before the links go; atomic, since
  // every boot reads it and must never see half of it
  setFileAtomic({
    path: asRoleModdedViewRecordPath({ roleDir: input.roleDir }),
    content: `${JSON.stringify(
      new RoleModdedViewRecord({
        sources: input.sources,
        paths: [...input.links.keys()].sort(),
        hookBasis: input.hookBasis,
        refusal: null,
      }),
      null,
      2,
    )}\n`,
  });

  for (const kind of ['briefs', 'skills'] as const) {
    const linksOfKind = [...input.links].filter(([path]) =>
      path.startsWith(`${kind}/`),
    );
    if (input.sources[kind].length === 0 && linksOfKind.length === 0) continue;

    // the kind dir is rebuilt whole beside it, then renamed into place
    setRoleKindDirSwapped({
      kindDir: join(input.roleDir, kind),
      build: ({ dir }) =>
        setRoleViewLinks({
          dir,
          links: linksOfKind.map(([path, target]) => ({
            path: path.slice(`${kind}/`.length),
            target,
          })),
        }),
    });
  }
};
