/**
 * .what = minimal entrypoint for `rhachet run` command only
 * .why = fast startup via skip of registry load; reads from .agent/ directly
 */
import { Command } from 'commander';
import { withEmojiSpaceShim } from 'emoji-space-shim';

import { invokeRun } from './invokeRun';

const _invoke = async (): Promise<void> => {
  const program = new Command();
  program.name('rhachet').description('bun binary for rhachet run');

  invokeRun({ program });

  program.parse(process.argv);
};

// wrap entrypoint with emoji shim for correct terminal render
void withEmojiSpaceShim({ logic: _invoke });
