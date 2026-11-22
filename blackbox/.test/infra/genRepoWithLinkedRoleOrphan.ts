import { genTempDir } from 'test-fns';

import { setupEnrollFixture } from '@/blackbox/.test/infra/enrollCloneHarness';

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * .what = a repo with the roles linked and the given files planted in a linked package role
 * .why = a defect this repo cannot repair: it warns, never holds, and names the supplier levers
 */
export const genRepoWithLinkedRoleContent = (input: {
  slug: string;
  files: Record<string, string>;
}): {
  dir: string;
  env: { CLAUDE_CONFIG_DIR: string };
} => {
  const dir = genTempDir({ slug: input.slug });
  const configDir = genTempDir({ slug: `${input.slug}-cfg` });
  setupEnrollFixture({ dir });

  // a package role dir of its own, never a link into the shared node_modules
  const roleDir = join(dir, '.agent', 'repo=fixturepkg', 'role=lint');
  Object.entries(input.files).forEach(([relpath, content]) => {
    mkdirSync(dirname(join(roleDir, relpath)), { recursive: true });
    writeFileSync(join(roleDir, relpath), content);
  });
  return { dir, env: { CLAUDE_CONFIG_DIR: configDir } };
};

/**
 * .what = a repo with the roles linked and an orphan `.md.min` in a linked package role
 */
export const genRepoWithLinkedRoleOrphan = (): {
  dir: string;
  env: { CLAUDE_CONFIG_DIR: string };
} =>
  genRepoWithLinkedRoleContent({
    slug: 'role-defect-linked',
    files: { 'briefs/gone.md.min': '# gone\n' },
  });
