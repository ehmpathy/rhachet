import type { RoleInitExecutable } from '@src/domain.objects/RoleInitExecutable';

import { execSync } from 'node:child_process';

/**
 * .what = executes an init script with passthrough args
 * .why = runs the discovered init with full arg passthrough
 */
export const executeInit = (input: {
  init: RoleInitExecutable;
  args: string[];
}): void => {
  // build command with args
  const command = [input.init.path, ...input.args]
    .map((arg) => {
      // quote args with spaces
      if (arg.includes(' ')) return `"${arg}"`;
      return arg;
    })
    .join(' ');

  // execute with inherited stdio
  execSync(command, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: '/bin/bash',
  });
};
