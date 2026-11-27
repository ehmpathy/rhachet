import { MalfunctionError } from 'helpful-errors';

import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleLinkRefAtFocus } from '@src/domain.objects/RoleLinkRefAtFocus';
import { asRoleModsSkippedBlockLines } from '@src/domain.operations/mods/asRoleModsSkippedBlockLines';
import { getAllRoleModFaultsUncarried } from '@src/domain.operations/mods/getAllRoleModFaultsUncarried';
import { setFileAtomic } from '@src/infra/setFileAtomic';
import { asTextOfLines } from '@src/utils/asTextOfLines';

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { asBootCorpusWithCacheBoundary } from './asBootCorpusWithCacheBoundary';
import { asRoleRefsInCacheOrder } from './asRoleRefsInCacheOrder';
import { assertBootMdDelivered } from './assertBootMdDelivered';
import type {
  BrainDirBootRender,
  BrainDirBootScope,
} from './BrainDirBootRender';
import { BRAIN_DIR_BOOT_FILENAMES } from './constants';
import { getOneRoleBootContent } from './getOneRoleBootContent';
import { setBrainDirPointerFiles } from './setBrainDirPointerFiles';

/**
 * .what = render roles into one brain dir's `boot.md`, then its pointer files
 * .why = a clone boots from its brain dir; the corpus is written at render time, never
 *        per session, so every clone of one brain dir reads the same bytes
 *
 * .note = roles render from `repoPath`'s `.agent/` after the one rhachet intro brief
 *         (`getOneRhachetBootIntro`): the published roles first, then the boundary line,
 *         then the `repo=.this` roles (`asRoleRefsInCacheOrder`), each group in enrollment
 *         order — so a local edit re-writes only the cached tail
 * .note = a focused role renders its subjects alone; a whole one (`subjects: null`) renders
 *         every subject, as it always has
 * .note = a mod fault no role carries closes the corpus as one `<mods.skipped>` block, after
 *         the local tail, so it rewrites only the part a local edit already rewrites
 * .note = every caller injects the context of the repo it renders, so a forgotten one fails at
 *         compile time rather than reads a repo it was never handed
 */
export const setBrainDirBoot = async (
  input: {
    brainDir: string;
    roles: RoleLinkRefAtFocus[];
    repoPath: string;
    scope: BrainDirBootScope;
  },
  context: ContextCli,
): Promise<BrainDirBootRender> => {
  // render each role: the published roles, then the repo=.this roles, each in the one
  //   enrollment order; Promise.all keeps that order
  const { published, local } = asRoleRefsInCacheOrder({ refs: input.roles });
  const renderOne = async (ref: RoleLinkRefAtFocus) => ({
    ref,
    ...(await getOneRoleBootContent({
      slugRepo: ref.repo,
      slugRole: ref.role,
      subjects: ref.subjects,
      cwd: input.repoPath,
    })),
  });
  const [contentsPublished, contentsLocal] = await Promise.all([
    Promise.all(published.map(renderOne)),
    Promise.all(local.map(renderOne)),
  ]);

  // join the corpus around the boundary line, before any write; a role body that holds the
  //   literal is refused here
  const corpusOfRoles = asBootCorpusWithCacheBoundary({
    published: contentsPublished,
    local: contentsLocal,
  });

  // a mod fault no role carries is named once, after the last role, so the cached prefix holds
  //   whether a fault appears or is cured
  const linesModsSkipped = asRoleModsSkippedBlockLines({
    faults: getAllRoleModFaultsUncarried({}, context),
  });
  const corpus = {
    ...corpusOfRoles,
    body: `${corpusOfRoles.body}${asTextOfLines({ lines: linesModsSkipped })}`,
  };

  // write boot.md whole, then the pointer files; an fs fault names the brain dir
  const bootMdPath = join(input.brainDir, BRAIN_DIR_BOOT_FILENAMES.bootMd);
  // read BEFORE the write, so the report can say `created` rather than `upgraded`.
  //   after `setFileAtomic` the two cases are indistinguishable
  const bootMdCreated = !existsSync(bootMdPath);
  // read BEFORE the write, so the report can tell a changed corpus from an identical re-render
  const bootMdBefore = bootMdCreated ? null : readFileSync(bootMdPath, 'utf8');
  const bootMdChanged = bootMdBefore !== corpus.body;
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
