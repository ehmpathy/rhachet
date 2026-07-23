import * as fs from 'fs/promises';
import * as path from 'path';

import type { ClaudeCodeSettings } from '@src/_topublish/rhachet-brains-anthropic/src/hooks/config.dao';
import type { BrainCliEnrollmentManifest } from '@src/domain.objects/BrainCliEnrollmentManifest';

import { createHash } from 'node:crypto';
import { getSettingsForRoles } from './getSettingsForRoles';
import { getSupportedBrainCommand } from './getSupportedBrainCommand';

/**
 * .what = generates unique brain config with only enrolled roles' hooks
 * .why = enables customized role enrollment via --setting-sources user --settings <path>
 *
 * .note = reads extant settings.json which has all synced hooks
 * .note = filters to only include hooks from enrolled roles
 * .note = retains permissions from repo settings.json
 * .note = writes to unique settings.enroll.$hash.local.json file
 */
export const genBrainCliConfigArtifact = async (input: {
  enrollment: BrainCliEnrollmentManifest;
  repoPath: string;
}): Promise<{ configPath: string }> => {
  const { enrollment, repoPath } = input;

  // validate brain is supported (shared transformer — throws BadRequestError if not)
  getSupportedBrainCommand({ brain: enrollment.brain });

  // read current settings.json (has all synced hooks and permissions)
  const settingsAll = await readSettingsJson({ repoPath });

  // filter hooks to only include enrolled roles (retain permissions)
  const settingsFiltered = getSettingsForRoles({
    settings: settingsAll,
    roles: enrollment.roles,
  });

  // generate unique filename and write config
  const configPath = await writeEnrollmentConfig({
    settings: settingsFiltered,
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
 * .what = generates unique hash for enrollment config filename
 * .why = ensures no collision with other enrollment sessions
 */
const genEnrollmentHash = (input: {
  enrollment: BrainCliEnrollmentManifest;
}): string => {
  const data = JSON.stringify({
    brain: input.enrollment.brain,
    roles: input.enrollment.roles.sort(),
  });
  return createHash('sha256').update(data).digest('hex').slice(0, 8);
};

/**
 * .what = writes filtered settings to unique enrollment config file
 * .why = unique file prevents collision; used with --setting-sources local --settings <path>
 */
const writeEnrollmentConfig = async (input: {
  settings: ClaudeCodeSettings;
  enrollment: BrainCliEnrollmentManifest;
  repoPath: string;
}): Promise<string> => {
  const settingsDir = path.join(input.repoPath, '.claude');
  const hash = genEnrollmentHash({ enrollment: input.enrollment });
  const settingsPath = path.join(
    settingsDir,
    `settings.enroll.${hash}.local.json`,
  );

  // ensure directory exists
  await fs.mkdir(settingsDir, { recursive: true });

  // write settings with indented json
  const content = JSON.stringify(input.settings, null, 2);
  await fs.writeFile(settingsPath, content + '\n', 'utf-8');

  return settingsPath;
};
