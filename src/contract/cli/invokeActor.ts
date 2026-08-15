import type { Command } from 'commander';

import { invokeActorList } from './invokeActorList';

/**
 * .what = register the `rhx actor` command group and its subcommands
 * .why = an actor is the durable identity (a { brain, roles } recipe); this group
 *   carries the identity reads, distinct from the clone (run) reads
 */
export const invokeActor = ({ program }: { program: Command }): void => {
  const actor = program
    .command('actor')
    .description('inspect enrolled actor identities');

  invokeActorList({ actor });
};
