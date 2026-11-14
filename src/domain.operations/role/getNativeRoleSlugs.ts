import type { ContextCli } from '@src/domain.objects/ContextCli';

import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = lists role slugs native to this repo (under .agent/repo=.this)
 * .why = removal must reject native roles (they are not package-linked and
 *        cannot be re-added by `+role`), so it needs to know which slugs
 *        are native — the counterpart to discoverLinkedRoles, which excludes .this
 *
 * .note = returns [] when .agent or repo=.this is absent
 */
export const getNativeRoleSlugs = (
  _input: Record<string, never>,
  context: ContextCli,
): string[] => {
  const repoThisDir = resolve(context.cwd, '.agent', 'repo=.this');
  if (!existsSync(repoThisDir)) return [];

  return readdirSync(repoThisDir)
    .filter((entry) => entry.startsWith('role='))
    .map((entry) => entry.replace('role=', ''));
};
