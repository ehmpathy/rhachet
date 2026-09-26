import { ConstraintError } from 'helpful-errors';

import { setFileAtomic } from '@src/infra/setFileAtomic';

import {
  existsSync,
  lstatSync,
  readFileSync,
  readlinkSync,
  symlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import {
  BRAIN_DIR_AGENTS_MD_CONTENT,
  BRAIN_DIR_BOOT_FILENAMES,
} from './constants';

/**
 * .what = write a brain dir's pointer files: `AGENTS.md` = `@boot.md`, and `CLAUDE.md`
 *         a relative symlink to `AGENTS.md`
 * .why = `CLAUDE.md` is the ungated door the cli always reads (D7); rhachet owns the
 *        whole boot context, so a hand edit of `AGENTS.md` is reset and reported
 *
 * .note = the `CLAUDE.md` findsert never clobbers: a file there, or a symlink elsewhere,
 *         is a ConstraintError that names the path
 */
export const setBrainDirPointerFiles = (input: {
  brainDir: string;
}): { agentsMdReset: boolean } => {
  const agentsMdPath = join(input.brainDir, BRAIN_DIR_BOOT_FILENAMES.agentsMd);
  const claudeMdPath = join(input.brainDir, BRAIN_DIR_BOOT_FILENAMES.claudeMd);

  // a prior AGENTS.md with other content is a reset the caller must name
  const agentsMdPrior = existsSync(agentsMdPath)
    ? readFileSync(agentsMdPath, 'utf8')
    : null;
  const agentsMdReset =
    agentsMdPrior !== null && agentsMdPrior !== BRAIN_DIR_AGENTS_MD_CONTENT;
  if (agentsMdPrior !== BRAIN_DIR_AGENTS_MD_CONTENT)
    setFileAtomic({ path: agentsMdPath, content: BRAIN_DIR_AGENTS_MD_CONTENT });

  // findsert CLAUDE.md -> AGENTS.md, relative
  const claudeMdStat = (() => {
    try {
      return lstatSync(claudeMdPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  })();
  if (!claudeMdStat) {
    symlinkSync(BRAIN_DIR_BOOT_FILENAMES.agentsMd, claudeMdPath, 'file');
    return { agentsMdReset };
  }
  if (
    claudeMdStat.isSymbolicLink() &&
    readlinkSync(claudeMdPath) === BRAIN_DIR_BOOT_FILENAMES.agentsMd
  )
    return { agentsMdReset };

  // a CLAUDE.md we did not make is never clobbered
  throw new ConstraintError(
    `${BRAIN_DIR_BOOT_FILENAMES.claudeMd} in a brain dir is not the rhachet symlink`,
    {
      path: claudeMdPath,
      found: claudeMdStat.isSymbolicLink()
        ? `a symlink to ${readlinkSync(claudeMdPath)}`
        : 'a file',
      hint: `remove ${claudeMdPath}, then re-run; rhachet makes it a symlink to ${BRAIN_DIR_BOOT_FILENAMES.agentsMd}`,
    },
  );
};
