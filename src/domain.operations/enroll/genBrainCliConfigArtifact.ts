import * as fs from 'fs/promises';
import * as path from 'path';

import type { ClaudeCodeSettings } from '@src/_topublish/rhachet-brains-anthropic/src/hooks/config.dao';
import type { BrainCliEnrollmentManifest } from '@src/domain.objects/BrainCliEnrollmentManifest';
import type { BrainSlug } from '@src/domain.objects/BrainSlug';

import { createHash } from 'node:crypto';

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

  // validate brain is claude (only supported brain for now)
  validateBrainSupported({ brain: enrollment.brain });

  // read current settings.json (has all synced hooks and permissions)
  const settingsAll = await readSettingsJson({ repoPath });

  // filter hooks to only include enrolled roles (retain permissions)
  const settingsFiltered = filterHooksToRoles({
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
 * .what = validates brain is supported for config generation
 * .why = fail fast if brain is not yet supported
 */
const validateBrainSupported = (input: { brain: BrainSlug }): void => {
  const supportedBrains = ['claude', 'claude-code'];
  if (!supportedBrains.includes(input.brain)) {
    throw new Error(
      `brain '${input.brain}' not supported for dynamic config. supported: ${supportedBrains.join(', ')}`,
    );
  }
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
 * .what = filters hooks to only include those from enrolled roles
 * .why = dynamic config should only have hooks from specified roles
 *
 * .note = real hook structure: { matcher: "*", hooks: [{ author: "repo=X/role=Y", ... }] }
 * .note = we filter inner hooks by author field, then drop entries with no hooks left
 */
const filterHooksToRoles = (input: {
  settings: ClaudeCodeSettings;
  roles: string[];
}): ClaudeCodeSettings => {
  const { settings, roles } = input;

  if (!settings.hooks) return settings;

  // create matcher patterns for enrolled roles
  // author format: `repo=X/role=Y`
  const rolePatterns = roles.map((role) => `role=${role}`);

  // filter each hook event category
  const hooksFiltered: ClaudeCodeSettings['hooks'] = {};

  for (const [eventName, entries] of Object.entries(settings.hooks)) {
    if (!entries) continue;

    // filter each entry's inner hooks by author field
    const filteredEntries = entries
      .map((entry) => {
        // filter inner hooks to only those from enrolled roles
        const filteredInnerHooks = entry.hooks.filter((hook) => {
          const author = (hook as { author?: string }).author;
          if (!author) return false;
          return rolePatterns.some((pattern) => author.includes(pattern));
        });

        // if no inner hooks match, skip this entry entirely
        if (filteredInnerHooks.length === 0) return null;

        // return entry with filtered inner hooks
        return { ...entry, hooks: filteredInnerHooks };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    if (filteredEntries.length > 0) {
      hooksFiltered[eventName as keyof typeof hooksFiltered] = filteredEntries;
    }
  }

  return {
    ...settings,
    hooks: hooksFiltered,
  };
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
