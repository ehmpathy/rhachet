import type { RoleManifest } from '@src/domain.objects/RoleManifest';
import type { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';

import { spawn } from 'node:child_process';
import { relative } from 'node:path';

/**
 * .what = executes init commands for a role
 * .why = shared init logic for invokeRolesInit and initRolesFromPackages
 *
 * .note = executes role.inits.exec commands sequentially via /bin/bash
 * .note = streams output in real-time with │ prefix
 * .note = throws on failure; caller decides how to handle (exit vs catch)
 */
export const execRoleInits = async (input: {
  role: RoleManifest;
  repo: RoleRegistryManifest;
}): Promise<{ commandsExecuted: number; commandsTotal: number }> => {
  const execCmds = input.role.inits?.exec ?? [];

  // skip if no init commands
  if (execCmds.length === 0) {
    return { commandsExecuted: 0, commandsTotal: 0 };
  }

  console.log('');
  console.log(`💪 init role repo=${input.repo.slug}/role=${input.role.slug}`);

  // execute each command sequentially
  for (const [idx, { cmd }] of execCmds.entries()) {
    const cmdRelative = relative(process.cwd(), cmd);
    const branch = idx === execCmds.length - 1 ? '└─' : '├─';
    console.log(`   ${branch} ${cmdRelative}`);
    console.log(`      ├─`);
    console.log(`      │`);

    // track whether output ended with a newline and if last line was empty
    let lastCharWasNewline = true;
    let lastLineWasEmpty = false;

    // run command and stream output
    const exitCode = await new Promise<number>((resolve, reject) => {
      const child = spawn(cmd, [], {
        cwd: process.cwd(),
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: '/bin/bash',
      });

      // stream handler: prefix each line with │
      const handleData = (data: Buffer) => {
        const text = data.toString();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const isLastSegment = i === lines.length - 1;

          // if this is the last segment and it's empty, text ended with \n
          if (isLastSegment && line === '') {
            lastCharWasNewline = true;
            continue;
          }

          // print prefix + line (include newline unless this is a partial line)
          const needsNewline = !isLastSegment;
          const prefix = line === '' ? '      │' : `      │ ${line}`;
          process.stdout.write(`${prefix}${needsNewline ? '\n' : ''}`);
          lastLineWasEmpty = line === '';
          lastCharWasNewline = needsNewline;
        }
      };

      child.stdout?.on('data', handleData);
      child.stderr?.on('data', handleData);

      child.on('error', reject);
      child.on('close', (code) => resolve(code ?? 0));
    });

    // ensure we're on a new line before closing frame
    if (!lastCharWasNewline) {
      process.stdout.write('\n');
    }

    // emit closing elbow (skip extra │ if last output was already an empty line)
    if (!lastLineWasEmpty) {
      console.log(`      │`);
    }
    console.log(`      └─`);

    // throw on failure; caller decides how to handle
    if (exitCode !== 0) {
      throw new Error(`init command failed: ${cmd} (exit code ${exitCode})`);
    }

    // print tree connector between commands (not after the last one)
    const isLastCommand = idx === execCmds.length - 1;
    if (!isLastCommand) {
      console.log(`   │`);
    }
  }

  console.log('');
  return { commandsExecuted: execCmds.length, commandsTotal: execCmds.length };
};
