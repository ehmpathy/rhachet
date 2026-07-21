import { mkdirSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = builds a `.agent/repo=$repo/role=$role` dir with a readme symlink
 * .why = mirrors the structure execRoleLink produces, so removal + set-math
 *   tests can exercise a real linked set without invoking the full link path
 *
 * .note = returns the created `repo=…/role=…` dir path for callers that assert
 *   on it; callers that do not need it may ignore the return
 */
export const setMockLinkedRole = (input: {
  agentDir: string;
  repo: string;
  role: string;
  sourceReadme: string;
}): string => {
  const repoRoleDir = resolve(
    input.agentDir,
    `repo=${input.repo}`,
    `role=${input.role}`,
  );
  mkdirSync(repoRoleDir, { recursive: true });
  symlinkSync(input.sourceReadme, resolve(repoRoleDir, 'readme.md'), 'file');
  return repoRoleDir;
};
