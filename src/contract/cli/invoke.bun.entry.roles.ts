/**
 * .what = minimal entrypoint for `rhachet roles` subcommands (boot/cost)
 * .why = fast startup via skip of registry load; reads from the filesystem directly
 *
 * .note = this binary handles boot/cost which read from .agent/ symlinks
 *         roles link/init is routed to JIT binary (needs npm package imports)
 *
 * 🔴 .note = `boot` belongs on THIS binary because it fires from a `SessionStart` hook, once
 *    per role, on every session — and the budget gate lives INSIDE it, so the gate's whole
 *    cost is paid on the fast path.
 */
import { Command } from 'commander';
import { withEmojiSpaceShim } from 'emoji-space-shim';

import { emitCliErrorAndExit } from './emitCliErrorAndExit';
import { exitCleanOnClosedPipe } from './exitCleanOnClosedPipe';
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

  // 🔴 `parseAsync`, never `parse`. every action here is async, and `parse` returns before
  //    they settle — so a rejected action escaped as an UNHANDLED REJECTION the last handler
  //    below cannot see, and exited 1 whatever the error's class said
  await program.parseAsync(process.argv);
};

// wrap entrypoint with emoji shim for correct terminal render
// ⚠️ this entry is its own process root, so it owns its own last error handler — without one,
//   every throw escaped to bun's default render (raw `node_modules` source, a caret, a ten-frame
//   stack, a `Bun v…` footer) and exited 1 even for a `✋ ConstraintError` that owes 2
void withEmojiSpaceShim({
  logic: () => {
    exitCleanOnClosedPipe({
      stream: process.stdout,
      exit: (code) => process.exit(code),
      codePrior: () => process.exitCode,
    });
    return _invoke().catch((error: unknown) =>
      emitCliErrorAndExit({ error, args: process.argv.slice(2) }),
    );
  },
});
