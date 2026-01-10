/**
 * .what = minimal entrypoint for `rhachet roles` subcommands (boot/cost)
 * .why = fast startup via skip of registry load; reads from .agent/ directly
 *
 * .note = this binary handles boot/cost which read from .agent/ symlinks
 *         roles link/init is routed to JIT binary (needs npm package imports)
 */
import { Command } from 'commander';

import { withEmojiSpaceShim } from '@src/_topublish/emoji-space-shim/src';

import { invokeRolesBoot } from './invokeRolesBoot';
import { invokeRolesCost } from './invokeRolesCost';

const _invoke = async (): Promise<void> => {
  const program = new Command();
  program
    .name('rhachet')
    .description('bun binary for rhachet roles (boot/cost)');

  const rolesCommand = program
    .command('roles')
    .description('role context operations (boot/cost)');

  invokeRolesBoot({ command: rolesCommand });
  invokeRolesCost({ command: rolesCommand });

  program.parse(process.argv);
};

// wrap entrypoint with emoji shim for correct terminal render
void withEmojiSpaceShim({ logic: _invoke });
