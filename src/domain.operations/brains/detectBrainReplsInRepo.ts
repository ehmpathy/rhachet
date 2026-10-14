import * as fs from 'fs/promises';
import * as path from 'path';

import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';

/**
 * .what = detects brain repls present in a repository
 * .why = enables auto-detection of which brains to sync hooks to
 *
 * detection rules:
 * - .claude/settings.of.repo.json present, or a REAL .claude/settings.json file → 'anthropic/claude/code'
 * - .opencode/ directory present → 'anomaly/opencode'
 *
 * .note = `settings.of.repo.json` is the durable signal. `settings.json` counts only as a real
 *   file (a legacy repo not yet migrated, read by lstat); as an arrow it is the grove, which
 *   the layout findsert writes into every brain dir — so it says naught about whether the
 *   repo uses claude, and to count it would sync hooks into a repo with no claude adapter
 * .note = the layout findsert writes `settings.of.repo.json` into every repo actor brain dir, so
 *   in a repo whose roles boot this reads claude. the hook sync narrows it to the brains an
 *   installed package supplies (`getBrainsDetectedAndSupplied`)
 */
export const detectBrainReplsInRepo = async (
  context: ContextCli,
): Promise<BrainSpecifier[]> => {
  const detected: BrainSpecifier[] = [];

  // check for claude code
  const claudeDir = path.join(context.cwd, '.claude');
  const statRepoSettings = await lstatOrNullIfAbsent({
    path: path.join(claudeDir, 'settings.of.repo.json'),
  });
  const statLegacySettings = await lstatOrNullIfAbsent({
    path: path.join(claudeDir, 'settings.json'),
  });
  const isLegacySettingsFilePresent = !!statLegacySettings?.isFile();
  if (statRepoSettings || isLegacySettingsFilePresent)
    detected.push('anthropic/claude/code');

  // check for opencode
  const statOpencodeDir = await statOrNullIfAbsent({
    path: path.join(context.cwd, '.opencode'),
  });
  if (statOpencodeDir?.isDirectory()) detected.push('anomaly/opencode');

  return detected;
};

/**
 * .what = whether an fs error means the path is absent
 * .why = absence is the one expected fault of a probe; any other errno (EACCES, EIO, …)
 *        must surface, never read as "no brain here"
 */
const isFsErrorOfAbsence = (error: unknown): boolean => {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return code === 'ENOENT' || code === 'ENOTDIR';
};

/**
 * .what = lstat a path, or null when it is absent; any other fault rethrows
 */
const lstatOrNullIfAbsent = async (input: {
  path: string;
}): Promise<Awaited<ReturnType<typeof fs.lstat>> | null> => {
  try {
    return await fs.lstat(input.path);
  } catch (error) {
    if (isFsErrorOfAbsence(error)) return null;
    throw error;
  }
};

/**
 * .what = stat a path, or null when it is absent; any other fault rethrows
 */
const statOrNullIfAbsent = async (input: {
  path: string;
}): Promise<Awaited<ReturnType<typeof fs.stat>> | null> => {
  try {
    return await fs.stat(input.path);
  } catch (error) {
    if (isFsErrorOfAbsence(error)) return null;
    throw error;
  }
};
