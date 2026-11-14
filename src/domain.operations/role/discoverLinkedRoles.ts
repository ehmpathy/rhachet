import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { getAllRepoDirsOfKind } from '@src/domain.operations/role/getAllRepoDirsOfKind';

import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = discovers all linked roles from .agent/ directory
 * .why = enables --roles * to expand to all currently linked roles
 *
 * .note = excludes repo=.this (native roles) and repo=.mods (mods): neither is a package
 */
export const discoverLinkedRoles = (
  _input: Record<string, never>,
  context: ContextCli,
): RoleLinkRef[] => {
  const agentDir = resolve(context.cwd, '.agent');
  if (!existsSync(agentDir)) return [];

  const roles: RoleLinkRef[] = [];

  const repoEntries = getAllRepoDirsOfKind({ agentDir, kinds: ['package'] });

  for (const repoEntry of repoEntries) {
    const repoSlug = repoEntry.replace('repo=', '');
    const repoDir = resolve(agentDir, repoEntry);

    if (!existsSync(repoDir)) continue;

    const roleEntries = readdirSync(repoDir).filter((e) =>
      e.startsWith('role='),
    );
    for (const roleEntry of roleEntries) {
      const roleSlug = roleEntry.replace('role=', '');
      roles.push({ repo: repoSlug, role: roleSlug });
    }
  }

  return roles;
};
