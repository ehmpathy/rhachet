/**
 * .what = minimal entrypoint for `rhachet run` command only
 * .why = fast startup via skip of registry load; reads from .agent/ directly
 */
import { Command } from 'commander';
import { withEmojiSpaceShim } from 'emoji-space-shim';

import { emitCliErrorAndExit } from './emitCliErrorAndExit';
import { exitCleanOnClosedPipe } from './exitCleanOnClosedPipe';
import { invokeRun } from './invokeRun';

const _invoke = async (): Promise<void> => {
  const program = new Command();
  program
    .name('rhachet')
    .description('bun binary for rhachet run')
    .enablePositionalOptions(); // required for subcommand passThroughOptions

  invokeRun({ program });

  // ⚠️ `parseAsync`, never `parse` — a sync `parse` does NOT await an async action handler, so a
  //   rejection from one escapes as an unhandled rejection that the last handler below cannot see
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
