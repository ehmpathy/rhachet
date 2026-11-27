import { ConstraintError } from 'helpful-errors';

import { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';
import { asBootSayResourcesDefanged } from '@src/domain.operations/boot/asBootSayResourcesDefanged';
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
import { assertRoleModdedViewFresh } from '@src/domain.operations/mods/assertRoleModdedViewFresh';
import { assertRoleModSparesNativeRole } from '@src/domain.operations/mods/assertRoleModSparesNativeRole';
import { withRoleModReadConfirmed } from '@src/domain.operations/mods/withRoleModReadConfirmed';
import { asRepoSlugKind } from '@src/domain.operations/role/asRepoSlugKind';
import { asRoleContentDefectsOfOrphans } from '@src/domain.operations/role/briefs/asRoleContentDefectsOfOrphans';
import { BOOT_WALK_DIRS_SKIPPED } from '@src/domain.operations/role/briefs/constants';
import { getRoleBriefRefs } from '@src/domain.operations/role/briefs/getRoleBriefRefs';
import { getAllLinkedRoleRefs } from '@src/domain.operations/role/getAllLinkedRoleRefs';
import { getOneRoleBootSpecOrDefectFromRef } from '@src/domain.operations/role/getOneRoleBootSpecOrDefectFromRef';
import { getAllFilesFromDir } from '@src/infra/filesystem/getAllFilesFromDir';

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
 * .note = a content defect (an orphan `.md.min`, a copy of the cache boundary literal, a
 *         `boot.yml` that will not parse) is set aside and returned, never thrown: a clone
 *         must be born to repair it (`rule.forbid.content-checks-that-halt-enroll`). an
 *         identity fault (role not linked, focus undeclared, mod stale) still halts
 */
export const getOneRoleBootContent = async (input: {
  slugRepo: string;
  slugRole: string;
  subjects: string[] | null;
  cwd: string;
}): Promise<{
  body: string;
  stats: BootStats;
  defects: RoleContentDefect[];
}> => {
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

  // a native role is never modded (F18); a mod that names it is refused here, at its boot
  if (asRepoSlugKind({ slug: input.slugRepo }) !== 'package')
    assertRoleModSparesNativeRole({
      cwd: input.cwd,
      ref: { repo: input.slugRepo, role: input.slugRole },
      getRefsLinked: () =>
        getAllLinkedRoleRefs(
          {},
          new ContextCli({ cwd: input.cwd, gitroot: input.cwd }),
        ),
    });

  // a modded role boots its view only once that view is proven fresh; a boot never heals it.
  //   a `.this` role is never modded (F18), so its boot never reads a mod of its slug. a read
  //   that refuses is confirmed under the role view lock, so a render mid-swap never fails it
  const mod =
    asRepoSlugKind({ slug: input.slugRepo }) === 'package'
      ? await withRoleModReadConfirmed({ cwd: input.cwd }, () =>
          assertRoleModdedViewFresh({
            cwd: input.cwd,
            ref: { repo: input.slugRepo, role: input.slugRole },
            getRefsLinked: () =>
              getAllLinkedRoleRefs(
                {},
                new ContextCli({ cwd: input.cwd, gitroot: input.cwd }),
              ),
          }),
        )
      : null;

  // read all files, then split into readme, briefs, and skills. the walk is the payload's walk
  //   and the stop memo's (`BOOT_WALK_DIRS_SKIPPED`), so a birth, `roles boot` and the stop
  //   fingerprint reach one file set, and a defect the birth finds always moves the memo
  const allFiles = [
    ...getAllFilesFromDir(
      { dir: roleDir },
      { skipDirNames: BOOT_WALK_DIRS_SKIPPED },
    ),
  ].sort();
  const briefsDir = resolve(roleDir, 'briefs');
  const skillsDir = resolve(roleDir, 'skills');
  const readmePath = resolve(roleDir, 'readme.md');

  // keep the briefs, less the work-in-progress and deprecated brief dirs
  const readmeFile = allFiles.find((f) => f === readmePath) ?? null;
  const briefFilesRaw = asRoleBriefFiles({ allFiles, briefsDir });

  // prefer .md.min content; an orphan minified brief is never a ref, so it is set aside
  const ref = { repo: input.slugRepo, role: input.slugRole };
  const { refs: briefRefs, orphans } = getRoleBriefRefs({
    briefFiles: briefFilesRaw,
    briefsDir,
  });
  const defectsOfOrphans = asRoleContentDefectsOfOrphans({
    orphans,
    ref,
    cwd: input.cwd,
  });
  const skillFiles = asRoleSkillFiles({ allFiles, skillsDir });

  // load boot.yml where present; a spec that will not parse renders the role refs-only
  const { spec: bootConfig, defect: defectOfSpec } =
    getOneRoleBootSpecOrDefectFromRef({ ref, repoPath: input.cwd });

  // a focus must name subjects the role declares; a role upgrade that drops one halts here,
  //   loud, rather than re-render the actor whole or without the role (U1). a refs-only role
  //   renders whole, since its subjects cannot be read
  const subjectsAsked = defectOfSpec ? null : input.subjects;
  const subjects = subjectsAsked ?? [];
  assertRoleFocusDeclared({
    slugRole: input.slugRole,
    subjects: subjectsAsked,
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
  // caller fault; a copy of the cache boundary literal in a said file is defanged
  const { said: saidAll, defects: defectsOfBoundary } =
    asBootSayResourcesDefanged({
      said: getAllBootSayResources({
        pathToReadme: readmeFile,
        briefsSay: bootPlan.briefs.say,
        skillsSay: bootPlan.skills.say,
      }),
      ref,
      cwd: input.cwd,
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

  // compose the body and its census, with each content defect set aside
  const { body, stats } = asRoleBootBody({
    slugRepo: input.slugRepo,
    slugRole: input.slugRole,
    roleDir,
    bootPlan,
    readme,
    briefsSaid,
    skillsSaid,
    focus,
    mod: mod ? { ofLabel: mod.ofLabel, plan: mod.plan } : null,
  });
  return {
    body,
    stats,
    defects: [
      ...defectsOfOrphans,
      ...(defectOfSpec ? [defectOfSpec] : []),
      ...defectsOfBoundary,
    ],
  };
};
