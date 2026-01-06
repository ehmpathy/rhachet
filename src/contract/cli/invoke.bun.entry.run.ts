/**
 * .what = minimal entrypoint for `rhachet run` command only
 * .why = fast startup via skip of registry load; reads from .agent/ directly
 */
import { Command } from 'commander';

import { invokeRun } from './invokeRun';

const program = new Command();
program.name('rhachet').description('bun binary for rhachet run');

invokeRun({ program });

program.parse(process.argv);
