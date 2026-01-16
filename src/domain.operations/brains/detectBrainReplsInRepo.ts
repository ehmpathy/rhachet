import * as fs from 'fs/promises';
import * as path from 'path';

import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';

/**
 * .what = detects brain repls present in a repository
 * .why = enables auto-detection of which brains to sync hooks to
 *
 * detection rules:
 * - .claude/settings.json present → 'anthropic/claude/code'
 * - .opencode/ directory present → 'anomaly/opencode'
 */
export const detectBrainReplsInRepo = async (input: {
  repoPath: string;
}): Promise<BrainSpecifier[]> => {
  const { repoPath } = input;
  const detected: BrainSpecifier[] = [];

  // check for claude code
  const claudeSettingsPath = path.join(repoPath, '.claude', 'settings.json');
  try {
    await fs.access(claudeSettingsPath);
    detected.push('anthropic/claude/code');
  } catch {
    // file not present
  }

  // check for opencode
  const opencodeDirPath = path.join(repoPath, '.opencode');
  try {
    const stat = await fs.stat(opencodeDirPath);
    if (stat.isDirectory()) {
      detected.push('anomaly/opencode');
    }
  } catch {
    // directory not present
  }

  return detected;
};
