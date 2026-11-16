import type { Command } from 'commander';

import { invokeBrainsAuthGet } from './invokeBrainsAuthGet';
import { invokeBrainsAuthSet } from './invokeBrainsAuthSet';
import { invokeBrainsAuthUse } from './invokeBrainsAuthUse';

/**
 * .what = register the `rhx brains` command group and its `auth` verbs
 * .why = one home for brain credentials: set a login into the keyrack, get each account's usage,
 *   use an account at a scope (wish: brains auth set | get | use)
 */
export const invokeBrains = ({ program }: { program: Command }): void => {
  const brains = program
    .command('brains')
    .description('manage brain credentials — auth set, get, use');
  const auth = brains
    .command('auth')
    .description('brain account logins — set, get, use');

  invokeBrainsAuthSet({ auth });
  invokeBrainsAuthGet({ auth });
  invokeBrainsAuthUse({ auth });
};
