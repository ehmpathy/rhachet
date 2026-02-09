import { assertZeroOrphanMinifiedBriefs } from '@src/domain.operations/role/briefs/assertZeroOrphanMinifiedBriefs';
import { getRoleBriefRefs } from '@src/domain.operations/role/briefs/getRoleBriefRefs';
import { getAllFilesFromDir } from '@src/infra/filesystem/getAllFilesFromDir';

import { readFileSync } from 'node:fs';
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
 * .what = re-exports getAllFilesFromDir for backwards compatibility
 * .why = prior tests import getAllFiles from this module
 */
export const getAllFiles = getAllFilesFromDir;

/**
 * .what = calculates token costs for all files in a role directory
 * .why = shared between "roles boot" and "roles cost" commands
 * .how = reads files, applies skill doc extraction, computes tokens
 */
export const getRoleFileCosts = (input: {
  roleDir: string;
  slugRepo: string;
  slugRole: string;
}): FileCost[] => {
  const { roleDir, slugRepo, slugRole } = input;

  // define directories for type classification
  const briefsDir = resolve(roleDir, 'briefs');
  const skillsDir = resolve(roleDir, 'skills');

  // collect all files
  const allFiles = getAllFiles(roleDir).sort();

  // blocklisted brief directories (work-in-progress and deprecated content)
  const blocklist = ['.scratch', '.archive'];

  // partition brief files and resolve .md.min preference
  const briefFilesRaw = allFiles
    .filter((f) => f.startsWith(briefsDir))
    .filter((f) => !blocklist.some((dir) => f.includes(`/${dir}/`)));
  const { refs: briefRefs, orphans } = getRoleBriefRefs({
    briefFiles: briefFilesRaw,
    briefsDir,
  });
  assertZeroOrphanMinifiedBriefs({ orphans });

  // collect non-brief files
  const skillFiles = allFiles.filter((f) => f.startsWith(skillsDir));
  const otherFiles = allFiles.filter(
    (f) => !f.startsWith(briefsDir) && !f.startsWith(skillsDir),
  );

  // calculate cost per million tokens ($3/mil)
  const costPerMillionTokens = 3;

  // helper to compute cost for a single file
  const computeFileCost = (input: {
    filepath: string;
    relativePath: string;
    type: FileCost['type'];
    isSkill: boolean;
  }): FileCost => {
    const contentToCount = input.isSkill
      ? extractSkillDocumentation(input.filepath)
      : readFileSync(input.filepath, 'utf-8');
    const chars = contentToCount.length;
    const tokens = Math.ceil(chars / 4);
    const cost = (tokens / 1_000_000) * costPerMillionTokens;
    return {
      path: input.filepath,
      relativePath: input.relativePath,
      chars,
      tokens,
      cost,
      type: input.type,
      isDocsOnly: input.isSkill,
    };
  };

  // compute costs for briefs (pathToOriginal for identity, pathToMinified ?? pathToOriginal for content)
  const briefCosts: FileCost[] = briefRefs.map((ref) => {
    const contentPath = ref.pathToMinified ?? ref.pathToOriginal;
    return computeFileCost({
      filepath: contentPath,
      relativePath: `.agent/repo=${slugRepo}/role=${slugRole}/${relative(roleDir, ref.pathToOriginal)}`,
      type: 'brief',
      isSkill: false,
    });
  });

  // compute costs for skills
  const skillCosts: FileCost[] = skillFiles.map((filepath) =>
    computeFileCost({
      filepath,
      relativePath: `.agent/repo=${slugRepo}/role=${slugRole}/${relative(roleDir, filepath)}`,
      type: 'skill',
      isSkill: true,
    }),
  );

  // compute costs for other files
  const otherCosts: FileCost[] = otherFiles.map((filepath) =>
    computeFileCost({
      filepath,
      relativePath: `.agent/repo=${slugRepo}/role=${slugRole}/${relative(roleDir, filepath)}`,
      type: 'other',
      isSkill: false,
    }),
  );

  return [...otherCosts, ...briefCosts, ...skillCosts];
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
