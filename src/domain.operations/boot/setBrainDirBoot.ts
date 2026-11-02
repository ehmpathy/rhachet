import { MalfunctionError } from 'helpful-errors';

import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { asBootCorpus } from './asBootCorpus';
import { asRoleRefsInEnrollmentOrder } from './asRoleRefsInEnrollmentOrder';
import { assertBootMdDelivered } from './assertBootMdDelivered';
import type {
  BrainDirBootRender,
  BrainDirBootScope,
} from './BrainDirBootRender';
import { BRAIN_DIR_BOOT_FILENAMES } from './constants';
import { getOneRhachetBootIntro } from './getOneRhachetBootIntro';
import { getOneRoleBootContent } from './getOneRoleBootContent';
import { setBrainDirPointerFiles } from './setBrainDirPointerFiles';

/**
 * .what = render roles into one brain dir's `boot.md`, then its pointer files
 * .why = a clone boots from its brain dir; the corpus is written at render time, never
 *        per session, so every clone of one brain dir reads the same bytes
 *
 * .note = roles render from `repoPath`'s `.agent/`, in enrollment order, after the one
 *         rhachet intro brief (`getOneRhachetBootIntro`)
 */
export const setBrainDirBoot = async (input: {
  brainDir: string;
  roles: RoleLinkRef[];
  repoPath: string;
  scope: BrainDirBootScope;
}): Promise<BrainDirBootRender> => {
  // render each role, in the one enrollment order; Promise.all keeps that order
  const refsOrdered = asRoleRefsInEnrollmentOrder({ refs: input.roles });
  const contents = await Promise.all(
    refsOrdered.map((ref) =>
      getOneRoleBootContent({
        slugRepo: ref.repo,
        slugRole: ref.role,
        subjects: null,
        cwd: input.repoPath,
      }),
    ),
  );
  // the rhachet intro leads, ahead of every role
  const corpus = asBootCorpus({
    contents: [getOneRhachetBootIntro(), ...contents],
  });

  // write boot.md whole, then the pointer files; an fs fault names the brain dir
  const bootMdPath = join(input.brainDir, BRAIN_DIR_BOOT_FILENAMES.bootMd);
  // read BEFORE the write, so the report can say `created` rather than `upgraded`.
  //   after `setFileAtomic` the two cases are indistinguishable
  const bootMdCreated = !existsSync(bootMdPath);
  // and compare the prior bytes, so a byte-identical re-render is never called `upgraded`
  const bootMdChanged =
    bootMdCreated || readFileSync(bootMdPath, 'utf8') !== corpus.body;
  try {
    mkdirSync(input.brainDir, { recursive: true });
    setFileAtomic({ path: bootMdPath, content: corpus.body });
  } catch (error) {
    throw new MalfunctionError('brain dir boot.md could not be written', {
      brainDir: input.brainDir,
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }
  // read the corpus back and prove it is the one rendered — rendered == delivered
  assertBootMdDelivered({
    bootMdPath,
    rendered: corpus.body,
    delivered: readFileSync(bootMdPath, 'utf8'),
  });

  const { agentsMdReset } = setBrainDirPointerFiles({
    brainDir: input.brainDir,
  });
  return {
    scope: input.scope,
    bootMdPath,
    stats: corpus.stats,
    agentsMdReset,
    bootMdCreated,
    bootMdChanged,
  };
};
