import type { RoleManifest } from '@src/domain.objects/RoleManifest';
import type { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';

import { spawnSync } from 'node:child_process';
import { relative } from 'node:path';

/**
 * .what = executes init commands for a role
 * .why = shared init logic for invokeRolesInit and initRolesFromPackages
 *
 * .note = executes role.inits.exec commands sequentially via /bin/bash
 * .note = throws on failure; caller decides how to handle (exit vs catch)
 */
export const execRoleInits = (input: {
  role: RoleManifest;
  repo: RoleRegistryManifest;
  indent?: string;
}): { commandsExecuted: number; commandsTotal: number } => {
  const indent = input.indent ?? '';
  const execCmds = input.role.inits?.exec ?? [];

  // skip if no init commands
  if (execCmds.length === 0) {
    return { commandsExecuted: 0, commandsTotal: 0 };
  }

  console.log(
    `${indent}🔧 run init repo=${input.repo.slug}/role=${input.role.slug}`,
  );

  // execute each command sequentially
  for (const [idx, { cmd }] of execCmds.entries()) {
    const cmdRelative = relative(process.cwd(), cmd);
    const branch = idx === execCmds.length - 1 ? '└─' : '├─';
    console.log(`${indent}   ${branch} ${cmdRelative}`);

    const result = spawnSync(cmd, [], {
      cwd: process.cwd(),
      stdio: [process.stdin, process.stdout, process.stderr],
      shell: '/bin/bash',
    });

    // throw on failure; caller decides how to handle
    if (result.status !== 0) {
      throw new Error(
        `init command failed: ${cmd} (exit code ${result.status})`,
      );
    }
  }

  return { commandsExecuted: execCmds.length, commandsTotal: execCmds.length };
};
