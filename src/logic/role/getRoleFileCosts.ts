import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { extractSkillDocumentation } from './extractSkillDocumentation';

/**
 * .what = represents the cost breakdown for a single file
 * .why = enables per-file cost analysis and aggregation
 */
export interface FileCost {
  path: string;
  relativePath: string;
  chars: number;
  tokens: number;
  cost: number;
  type: 'brief' | 'skill' | 'other';
  isDocsOnly: boolean;
}

/**
 * .what = recursively collects all files from a directory, following symlinks
 * .why = need to traverse role directories including symlinked briefs/skills
 * .how = uses statSync which follows symlinks to traverse directories
 */
export const getAllFiles = (dir: string): string[] => {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = resolve(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else if (stats.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
};

/**
 * .what = calculates token costs for all files in a role directory
 * .why = shared between "roles boot" and "roles cost" commands
 * .how = reads files, applies skill doc extraction, computes tokens
 */
export const getRoleFileCosts = (input: {
  roleDir: string;
  repoSlug: string;
  roleSlug: string;
}): FileCost[] => {
  const { roleDir, repoSlug, roleSlug } = input;

  // define directories for type classification
  const briefsDir = resolve(roleDir, 'briefs');
  const skillsDir = resolve(roleDir, 'skills');

  // collect all files
  const allFiles = getAllFiles(roleDir).sort();

  // calculate cost per million tokens ($3/mil)
  const costPerMillionTokens = 3;

  // compute costs for each file
  const fileCosts: FileCost[] = allFiles.map((filepath) => {
    const isSkill = filepath.startsWith(skillsDir);
    const isBrief = filepath.startsWith(briefsDir);

    // determine content to count
    const contentToCount = isSkill
      ? extractSkillDocumentation(filepath)
      : readFileSync(filepath, 'utf-8');

    // calculate metrics
    const chars = contentToCount.length;
    const tokens = Math.ceil(chars / 4);
    const cost = (tokens / 1_000_000) * costPerMillionTokens;

    // determine file type
    const type: FileCost['type'] = isSkill
      ? 'skill'
      : isBrief
        ? 'brief'
        : 'other';

    return {
      path: filepath,
      relativePath: `.agent/repo=${repoSlug}/role=${roleSlug}/${relative(roleDir, filepath)}`,
      chars,
      tokens,
      cost,
      type,
      isDocsOnly: isSkill,
    };
  });

  return fileCosts;
};

/**
 * .what = aggregates file costs into summary statistics
 * .why = provides total counts for display in cost reports
 * .how = reduces file costs array into summary object
 */
export const aggregateFileCosts = (
  fileCosts: FileCost[],
): {
  totalFiles: number;
  briefFiles: number;
  skillFiles: number;
  otherFiles: number;
  totalChars: number;
  totalTokens: number;
  totalCost: number;
} => {
  const briefFiles = fileCosts.filter((f) => f.type === 'brief').length;
  const skillFiles = fileCosts.filter((f) => f.type === 'skill').length;
  const otherFiles = fileCosts.filter((f) => f.type === 'other').length;

  const totalChars = fileCosts.reduce((sum, f) => sum + f.chars, 0);
  const totalTokens = fileCosts.reduce((sum, f) => sum + f.tokens, 0);
  const totalCost = fileCosts.reduce((sum, f) => sum + f.cost, 0);

  return {
    totalFiles: fileCosts.length,
    briefFiles,
    skillFiles,
    otherFiles,
    totalChars,
    totalTokens,
    totalCost,
  };
};
