/**
 * .what = an absolute path under a repo's `.agent/`, as the repo-relative path a human types
 * .why = a fix line names its subject the way every other mod fix does, from the repo root, so a
 *        reader never meets a machine path in one readout and a repo path in the next
 *
 * .note = the first `/.agent/` segment marks the repo root; a path with none is returned as is
 */
export const asRepoRelPathOfAgentPath = (input: { path: string }): string => {
  const index = input.path.indexOf('/.agent/');
  if (index < 0) return input.path;
  return input.path.slice(index + 1);
};
