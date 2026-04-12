import { BadRequestError } from 'helpful-errors';

import type { Role } from '@src/domain.objects/Role';
import { getAllFilesByGlobs } from '@src/infra/filesystem/getAllFilesByGlobs';

import { existsSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_ARTIFACT_EXCLUSIONS = [
  '**/.*', // match dotfiles/dotdirs at any depth (e.g., .hidden.md, .test)
  '**/.*/**', // match files inside dotdirs at any depth (e.g., .test/fixture.md)
  '**/__test_*/**', // match __test_* at any depth
  '**/*.test.*', // match *.test.* at any depth
];

const DEFAULT_ARTIFACT_INCLUSIONS = {
  briefs: ['**/*.md', '**/*.min'],
  skills: ['**/*.sh', '**/*.jsonc', '**/template/**', '**/templates/**'],
  inits: ['**/*.sh', '**/*.jsonc'],
};

/**
 * .what = extracts uri strings from dirs config
 * .why = normalizes single vs array format to string array
 */
const extractDirUris = (
  dirs: { uri: string } | { uri: string }[] | undefined,
): string[] => {
  if (!dirs) return [];
  if (Array.isArray(dirs)) return dirs.map((d) => d.uri);
  return [dirs.uri];
};

/**
 * .what = collect all artifact paths for a single role
 * .why = centralize artifact discovery logic for repo compile
 */
export const getAllArtifactsForRole = async (input: {
  role: Role;
  fromDir: string;
  include?: string[];
  exclude?: string[];
}): Promise<string[]> => {
  const artifacts: string[] = [];

  // briefs from registered dirs
  for (const dir of extractDirUris(input.role.briefs?.dirs)) {
    const fullPath = path.join(input.fromDir, dir);
    if (!existsSync(fullPath)) {
      throw new BadRequestError('briefs dir not found', {
        role: input.role.slug,
        dir,
      });
    }
    const files = await getAllFilesByGlobs({
      cwd: fullPath,
      defaultInclude: DEFAULT_ARTIFACT_INCLUSIONS.briefs,
      defaultExclude: DEFAULT_ARTIFACT_EXCLUSIONS,
      userInclude: input.include ?? [],
      userExclude: input.exclude ?? [],
    });
    // convert to paths relative to fromDir
    artifacts.push(...files.map((f) => path.relative(input.fromDir, f)));
  }

  // skills from registered dirs
  for (const dir of extractDirUris(input.role.skills?.dirs)) {
    const fullPath = path.join(input.fromDir, dir);
    if (!existsSync(fullPath)) {
      throw new BadRequestError('skills dir not found', {
        role: input.role.slug,
        dir,
      });
    }
    const files = await getAllFilesByGlobs({
      cwd: fullPath,
      defaultInclude: DEFAULT_ARTIFACT_INCLUSIONS.skills,
      defaultExclude: DEFAULT_ARTIFACT_EXCLUSIONS,
      userInclude: input.include ?? [],
      userExclude: input.exclude ?? [],
    });
    // convert to paths relative to fromDir
    artifacts.push(...files.map((f) => path.relative(input.fromDir, f)));
  }

  // inits from registered dirs
  for (const dir of extractDirUris(input.role.inits?.dirs)) {
    const fullPath = path.join(input.fromDir, dir);
    if (!existsSync(fullPath)) {
      throw new BadRequestError('inits dir not found', {
        role: input.role.slug,
        dir,
      });
    }
    const files = await getAllFilesByGlobs({
      cwd: fullPath,
      defaultInclude: DEFAULT_ARTIFACT_INCLUSIONS.inits,
      defaultExclude: DEFAULT_ARTIFACT_EXCLUSIONS,
      userInclude: input.include ?? [],
      userExclude: input.exclude ?? [],
    });
    // convert to paths relative to fromDir
    artifacts.push(...files.map((f) => path.relative(input.fromDir, f)));
  }

  // role-level files (readme, boot, keyrack)
  const readmeUri = input.role.readme?.uri;
  if (readmeUri) {
    const readmePath = path.join(input.fromDir, readmeUri);
    if (existsSync(readmePath)) {
      artifacts.push(readmeUri);
    }
  }

  const bootUri = input.role.boot?.uri;
  if (bootUri) {
    const bootPath = path.join(input.fromDir, bootUri);
    if (existsSync(bootPath)) {
      artifacts.push(bootUri);
    }
  }

  const keyrackUri = input.role.keyrack?.uri;
  if (keyrackUri) {
    const keyrackPath = path.join(input.fromDir, keyrackUri);
    if (existsSync(keyrackPath)) {
      artifacts.push(keyrackUri);
    }
  }

  // sort for deterministic output: directories before files at each level
  return artifacts.sort((a, b) => {
    const aParts = a.split('/');
    const bParts = b.split('/');

    // compare segment by segment
    const minLen = Math.min(aParts.length, bParts.length);
    for (let i = 0; i < minLen; i++) {
      const aIsDir = i < aParts.length - 1;
      const bIsDir = i < bParts.length - 1;

      // at this level, directories come before files
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;

      // both are dirs or both are files, compare alphabetically
      const cmp = aParts[i]!.localeCompare(bParts[i]!);
      if (cmp !== 0) return cmp;
    }

    // shorter path first (shouldn't happen given the above logic)
    return aParts.length - bParts.length;
  });
};
