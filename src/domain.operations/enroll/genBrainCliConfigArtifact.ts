import * as fs from 'fs/promises';
import * as path from 'path';

import type { ClaudeCodeSettings } from '@src/_topublish/rhachet-brains-anthropic/src/hooks/config.dao';
import type { BrainCliEnrollmentManifest } from '@src/domain.objects/BrainCliEnrollmentManifest';
import { genEnrollmentHash } from '@src/domain.operations/actor/enrolled/genEnrollmentHash';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getDefaultActorOndiskDir } from '@src/domain.operations/actor/enrolled/getDefaultActorOndiskDir';
import { getHomeDir } from '@src/infra/getHomeDir';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { getSupportedBrainCommand } from '../brain/getSupportedBrainCommand';
import { getClaudeMdExcludesList } from './getClaudeMdExcludesList';
import { getSettingsForRoles } from './getSettingsForRoles';

/**
 * .what = generates unique brain config with only enrolled roles' hooks
 * .why = enables customized role enrollment via --setting-sources user --settings <path>
 *
 * .note = reads extant settings.json which has all synced hooks
 * .note = filters to only include hooks from enrolled roles
 * .note = retains permissions from repo settings.json
 * .note = adds claudeMdExcludes, so the repo's corpus never loads beside the actor's
 * .note = writes to unique settings.enroll.$hash.local.json file
 */
export const genBrainCliConfigArtifact = async (input: {
  enrollment: BrainCliEnrollmentManifest;
  repoPath: string;
}): Promise<{ configPath: string }> => {
  const { enrollment, repoPath } = input;

  // validate brain is supported (shared transformer — throws ConstraintError if not)
  getSupportedBrainCommand({ brain: enrollment.brain });

  // read current settings.json (has all synced hooks and permissions)
  const settingsAll = await readSettingsJson({ repoPath });

  // filter hooks to only include enrolled roles (retain permissions)
  const settingsFiltered = getSettingsForRoles({
    settings: settingsAll,
    roles: enrollment.roles,
  });

  // exclude every repo door, so the clone reads its actor's brain dir alone (D5, D12)
  const claudeMdExcludes = getClaudeMdExcludesList({
    repoPath,
    defaultBrainDir: getBrainOndiskDir({
      actorDir: getDefaultActorOndiskDir({ repoPath }),
    }),
    home: getHomeDir(),
  });

  // generate unique filename and write config
  const configPath = await writeEnrollmentConfig({
    settings: { ...settingsFiltered, claudeMdExcludes },
    enrollment,
    repoPath,
  });

  return { configPath };
};

/**
 * .what = reads settings.json from repo
 * .why = gets all synced hooks as baseline
 */
const readSettingsJson = async (input: {
  repoPath: string;
}): Promise<ClaudeCodeSettings> => {
  const settingsPath = path.join(input.repoPath, '.claude', 'settings.json');

  try {
    await fs.access(settingsPath);
  } catch {
    return {};
  }

  const content = await fs.readFile(settingsPath, 'utf-8');
  return JSON.parse(content) as ClaudeCodeSettings;
};

/**
 * .what = writes filtered settings to unique enrollment config file
 * .why = unique file prevents collision; used with --setting-sources local --settings <path>
 */
const writeEnrollmentConfig = async (input: {
  settings: ClaudeCodeSettings & { claudeMdExcludes: string[] };
  enrollment: BrainCliEnrollmentManifest;
  repoPath: string;
}): Promise<string> => {
  const settingsDir = path.join(input.repoPath, '.claude');
  const hash = genEnrollmentHash({
    brain: input.enrollment.brain,
    roles: input.enrollment.roles,
  });
  const settingsPath = path.join(
    settingsDir,
    `settings.enroll.${hash}.local.json`,
  );

  // write atomically: a concurrent same-actor enroll races the same hash onto the
  // same path, and the brain-cli must never boot on a half-written file. the
  // content is identical per hash, so last-writer-wins is safe
  setFileAtomic({
    path: settingsPath,
    content: `${JSON.stringify(input.settings, null, 2)}\n`,
  });

  return settingsPath;
};
