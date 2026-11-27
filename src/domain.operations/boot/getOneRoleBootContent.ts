import { ConstraintError } from 'helpful-errors';

import { ContextCli } from '@src/domain.objects/ContextCli';
import { asRoleBootBody } from '@src/domain.operations/boot/asRoleBootBody';
import { asRoleBriefFiles } from '@src/domain.operations/boot/asRoleBriefFiles';
import { asRoleFocusSummary } from '@src/domain.operations/boot/asRoleFocusSummary';
import { asRoleSkillFiles } from '@src/domain.operations/boot/asRoleSkillFiles';
import { assertRoleFocusDeclared } from '@src/domain.operations/boot/assertRoleFocusDeclared';
import { computeBootPlan } from '@src/domain.operations/boot/computeBootPlan';
import {
  type BootSayResource,
  getAllBootSayResources,
} from '@src/domain.operations/boot/getAllBootSayResources';
import { getAllRoleFilesToRead } from '@src/domain.operations/boot/getAllRoleFilesToRead';
import { assertRoleModdedViewFresh } from '@src/domain.operations/mods/assertRoleModdedViewFresh';
import { assertRoleModSparesNativeRole } from '@src/domain.operations/mods/assertRoleModSparesNativeRole';
import { getOneRoleModVerdict } from '@src/domain.operations/mods/getOneRoleModVerdict';
import { asRepoSlugKind } from '@src/domain.operations/role/asRepoSlugKind';
import { assertZeroOrphanMinifiedBriefs } from '@src/domain.operations/role/briefs/assertZeroOrphanMinifiedBriefs';
import { getRoleBriefRefs } from '@src/domain.operations/role/briefs/getRoleBriefRefs';
import { getAllLinkedRoleRefs } from '@src/domain.operations/role/getAllLinkedRoleRefs';
import { getOneRoleBootSpecFromRef } from '@src/domain.operations/role/getOneRoleBootSpecFromRef';

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BootStats } from './BootStats';

/**
 * .what = render one linked role's boot content — its readme, say and ref briefs,
 *         say and ref skills — into one body, with its census apart
 * .why = a brain dir's `boot.md` is built from it (`setBrainDirBoot`), so every brain
 *        dir renders a role the same way. `roles boot` renders through `genBootPayload`
 *
 * .note = the body holds no `<stats>` block, so a render is byte-stable across runs
 */
export const getOneRoleBootContent = async (input: {
  slugRepo: string;
  slugRole: string;
  subjects: string[] | null;
  cwd: string;
}): Promise<{ body: string; stats: BootStats }> => {
  const roleDir = resolve(
    input.cwd,
    '.agent',
    `repo=${input.slugRepo}`,
    `role=${input.slugRole}`,
  );

  // a role not linked on disk cannot render
  if (!existsSync(roleDir))
    throw new ConstraintError(
      `role not linked: repo=${input.slugRepo} role=${input.slugRole}`,
      {
        roleDir,
        hint:
          input.slugRepo === '.this'
            ? `create .agent/repo=.this/role=${input.slugRole}/[briefs,skills]`
            : `run: rhx roles link --repo ${input.slugRepo} --role ${input.slugRole}`,
      },
    );

  // the mod gate: a modded role boots its view only once that view is proven fresh, and a boot
  //   never heals it. a native role is never modded (F18), so a mod that names it is a fault.
  //   a mod fault never stops the boot: the role boots as published, and names the fault
  const ref = { repo: input.slugRepo, role: input.slugRole };
  const getRefsLinked = () =>
    getAllLinkedRoleRefs(
      {},
      new ContextCli({ cwd: input.cwd, gitroot: input.cwd }),
    );
  const verdict = await getOneRoleModVerdict(
    { cwd: input.cwd },
    {
      read: () => {
        if (asRepoSlugKind({ slug: input.slugRepo }) === 'package')
          return assertRoleModdedViewFresh({
            cwd: input.cwd,
            ref,
            getRefsLinked,
          });
        assertRoleModSparesNativeRole({ cwd: input.cwd, ref, getRefsLinked });
        return null;
      },
    },
  );
  const mod = verdict.verdict === 'modded' ? verdict : null;

  // read all files, then split into readme, briefs, and skills. a skipped mod is skipped whole,
  //   so the role boots its published files, whatever the view on disk still links (F03)
  const { files: allFiles, asPathToRead } = getAllRoleFilesToRead({
    roleDir,
    cwdOfSkippedMod: verdict.verdict === 'skipped' ? input.cwd : null,
    skipDirNames: [],
  });
  const briefsDir = resolve(roleDir, 'briefs');
  const skillsDir = resolve(roleDir, 'skills');
  const readmePath = resolve(roleDir, 'readme.md');

  // keep the briefs, less the work-in-progress and deprecated brief dirs
  const readmeFile = allFiles.find((f) => f === readmePath) ?? null;
  const briefFilesRaw = asRoleBriefFiles({ allFiles, briefsDir });

  // prefer .md.min content, and refuse an orphan minified brief
  const { refs: briefRefs, orphans } = getRoleBriefRefs({
    briefFiles: briefFilesRaw,
    briefsDir,
  });
  assertZeroOrphanMinifiedBriefs({ orphans });
  const skillFiles = asRoleSkillFiles({ allFiles, skillsDir });

  // load boot.yml where present, through the one reader the focus check also reads
  const bootConfig = getOneRoleBootSpecFromRef({
    ref: { repo: input.slugRepo, role: input.slugRole },
    repoPath: input.cwd,
  });

  // a focus must name subjects the role declares; a role upgrade that drops one halts here,
  //   loud, rather than re-render the actor whole or without the role (U1)
  const subjects = input.subjects ?? [];
  assertRoleFocusDeclared({
    slugRole: input.slugRole,
    subjects: input.subjects,
    config: bootConfig,
    focusFrom: 'recorded',
  });

  // decide what to say and what to ref
  const bootPlan = await computeBootPlan({
    config: bootConfig,
    configMod: mod?.spec.sections ?? null,
    briefRefs,
    skillPaths: skillFiles,
    cwd: roleDir,
    subjects: subjects.length > 0 ? subjects : undefined,
  });

  // read each said resource once, through the reader that classifies a vanished file as a
  // caller fault; its content feeds the body and the char census
  const saidAll = getAllBootSayResources({
    pathToReadme: readmeFile,
    briefsSay: bootPlan.briefs.say,
    skillsSay: bootPlan.skills.say,
    asPathToRead,
  });
  const asSaid = (tag: BootSayResource['tag']) =>
    saidAll
      .filter((one) => one.tag === tag)
      .map((one) => ({ path: one.pathToLabel, content: one.content }));
  const readme = asSaid('readme')[0] ?? null;
  const briefsSaid = asSaid('brief.say');
  const skillsSaid = asSaid('skill.say');

  // a focused role names the subjects it was not given, and whether `always` was shed (V1)
  const focus = asRoleFocusSummary({ config: bootConfig, subjects });

  // compose the body and its census
  return asRoleBootBody({
    slugRepo: input.slugRepo,
    slugRole: input.slugRole,
    roleDir,
    bootPlan,
    readme,
    briefsSaid,
    skillsSaid,
    focus,
    mod: mod ? { ofLabel: mod.ofLabel, plan: mod.plan } : null,
    skipped:
      verdict.verdict === 'skipped'
        ? { role: input.slugRole, error: verdict.error }
        : null,
  });
};
