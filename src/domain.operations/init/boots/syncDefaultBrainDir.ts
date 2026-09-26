import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getDefaultActorOndiskDir } from '@src/domain.operations/actor/enrolled/getDefaultActorOndiskDir';
import type { BrainDirBootRender } from '@src/domain.operations/boot/BrainDirBootRender';
import { BRAIN_DIR_BOOT_FILENAMES } from '@src/domain.operations/boot/constants';
import { setBrainDirBoot } from '@src/domain.operations/boot/setBrainDirBoot';
import { findsertFileLine } from '@src/infra/findsertFileLine';

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { findsertDefaultActorGitignoreExclusion } from './findsertDefaultActorGitignoreExclusion';
import { setRepoBrainDirSymlink } from './setRepoBrainDirSymlink';

/**
 * .what = render the repo's default roles into the default brain dir, link
 *         `<repo>/.claude` to it, and make both `.gitignore` edits (D10)
 * .why = an unenrolled `claude` reads `<repo>/.claude`; with the link it boots from
 *        the default actor's corpus, the same corpus enroll gives its default roleset
 *
 * .note = the render runs first, and a render that throws propagates: no link is made,
 *         so a failed render leaves `<repo>/.claude` as it was
 */
export const syncDefaultBrainDir = async (input: {
  repoPath: string;
  refsLinked: RoleLinkRef[];
}): Promise<{
  render: BrainDirBootRender;
  symlink: ReturnType<typeof setRepoBrainDirSymlink>;
}> => {
  // the parent tree exists before any write
  const defaultBrainDir = getBrainOndiskDir({
    actorDir: getDefaultActorOndiskDir({ repoPath: input.repoPath }),
  });
  mkdirSync(defaultBrainDir, { recursive: true });

  // render the corpus; a throw here stops the sync before the link
  const render = await setBrainDirBoot({
    brainDir: defaultBrainDir,
    roles: input.refsLinked,
    repoPath: input.repoPath,
    scope: { kind: 'default' },
  });

  // link <repo>/.claude to the rendered dir
  const symlink = setRepoBrainDirSymlink({
    repoPath: input.repoPath,
    defaultBrainDir,
  });

  // keep the regenerated corpus and the per-host settings out of git, and spare the
  //   default dir from the actors ignore. `<repo>/.claude` resolves here, so a
  //   `settings.local.json` and each enroll's `settings.enroll.<hash>.local.json` land here
  for (const line of [BRAIN_DIR_BOOT_FILENAMES.bootMd, '*.local.json'])
    findsertFileLine({ path: join(defaultBrainDir, '.gitignore'), line });
  findsertDefaultActorGitignoreExclusion({ repoPath: input.repoPath });

  return { render, symlink };
};
