import type { Command } from 'commander';
import { ConstraintError } from 'helpful-errors';
import { now } from 'iso-time';

import { getHomeDir } from '@src/infra/getHomeDir';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';

import { renderCliOutput } from './renderCliOutput';
import { withBrainsAuthVerb } from './withBrainsAuthVerb';

/**
 * .what = the scopes `use` names in each refusal, in one place
 * .why = the no-scope and unknown-scope refusals list the same choices, so they never disagree
 */
const BRAINS_AUTH_USE_SCOPES =
  'grove (every clone on this box) · tree (clones of one worktree, to come) · clone (one clone, to come)';

/**
 * .what = register `rhx brains auth use`
 * .why = case=3 — put a parked account to use at a scope, proven by a before and after compare
 * .note = `--scope` has no default (fulcrum F5): a swap of the whole grove is never the accident of
 *   an absent flag
 * .note = clone and tree scope wait on fulcrum F1, and refuse until the commander decides it
 * .note = no token reaches stdout in either mode
 */
export const invokeBrainsAuthUse = ({ auth }: { auth: Command }): void =>
  withBrainsAuthVerb<{ account?: string; scope?: string }>({
    auth,
    verb: 'use',
    description: 'put a stored brain account to use at a scope',
    does: 'use',
    options: (command) =>
      command
        .option('--account <email>', 'the stored account to use (required)')
        .option(
          '--scope <scope>',
          'where to use it, required — grove, the login every clone on this box reads (clone and tree to come)',
        )
        .addHelpText(
          'after',
          [
            '',
            'examples',
            '  rhx brains auth use --account b@example.com --scope grove                  # swap the box login to b',
            '  rhx brains auth use --account b@example.com --scope grove --output json    # for a machine to parse',
          ].join('\n'),
        ),
    run: async ({ mode, owner, opts }) => {
      // both flags are required, and a scope is never assumed (fulcrum F5)
      if (!opts.account)
        throw new ConstraintError('no --account supplied', {
          hint: 'rhx brains auth use --account <email> --scope grove   # accounts held: rhx brains auth get',
        });
      if (!opts.scope)
        throw new ConstraintError('no --scope supplied', {
          scopes: BRAINS_AUTH_USE_SCOPES,
          hint: `rhx brains auth use --account ${opts.account} --scope grove`,
        });

      // only grove scope is built; clone and tree wait on the commander
      if (opts.scope === 'clone' || opts.scope === 'tree')
        throw new ConstraintError('this scope is not yet supported', {
          scope: opts.scope,
          hint: `rhx brains auth use --account ${opts.account} --scope grove   # clone and tree scope are not yet built`,
        });
      if (opts.scope !== 'grove')
        throw new ConstraintError('unknown scope', {
          scope: opts.scope,
          scopes: BRAINS_AUTH_USE_SCOPES,
          hint: `rhx brains auth use --account ${opts.account} --scope grove`,
        });

      // name the live clones that hold the grove's account in memory (case=7); read before
      //   the swap, so a fault here never follows a mutation that landed
      const { getAllClonesLiveInRepo } = await import(
        '@src/domain.operations/clone/getAllClonesLiveInRepo'
      );
      const clonesLive = await getAllClonesLiveInRepo({
        repoPath: getOneRepoPath({ from: process.cwd() }),
      });

      // swap the grove, proven by the read back
      const { setBrainAuthAccountInUseAtGrove } = await import(
        '@src/domain.operations/brain/auth/account/setBrainAuthAccountInUseAtGrove'
      );
      const used = await setBrainAuthAccountInUseAtGrove({
        owner,
        home: getHomeDir(),
        email: opts.account,
        env: process.env,
      });

      // render the compare; an unchanged use shows only `after` (case=10 [t2])
      const { asBrainAuthUseTree } = await import(
        '@src/domain.operations/brain/auth/account/asBrainAuthUseTree'
      );
      const { asBrainAuthUseJson } = await import(
        '@src/domain.operations/brain/auth/account/asBrainAuthUseJson'
      );
      console.log(
        renderCliOutput({
          mode,
          tree: asBrainAuthUseTree({ ...used, owner, clonesLive, now: now() }),
          data: asBrainAuthUseJson({ ...used, owner, clonesLive }),
        }),
      );
    },
  });
