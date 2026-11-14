import { MalfunctionError } from 'helpful-errors';

import { ContextCli } from '@src/domain.objects/ContextCli';
import {
  type ClaudeCodeSettings,
  readClaudeCodeSettings,
} from '@src/domain.operations/brains/claudeCodeSettings';
import { getBrainsDetectedAndSupplied } from '@src/domain.operations/brains/getBrainsDetectedAndSupplied';
import { getLinkedRolesWithHooks } from '@src/domain.operations/brains/getLinkedRolesWithHooks';
import { syncAllRoleHooksIntoEachBrainRepl } from '@src/domain.operations/brains/syncAllRoleHooksIntoEachBrainRepl';
import { withScratchDir } from '@src/utils/withScratchDir';

import { isBrainClaudeCode } from './isBrainClaudeCode';

/**
 * .what = the claude hooks of every linked role, as the claude adapter writes them — rendered
 *         into an os temp dir that is removed before return, so the repo tree is never written
 * .why = under `.agent/actors.yml` the repo actor is a declared actor, narrowed to its own roles
 *        like every other. its `settings.of.repo.json` then holds only its own roles' hooks, so a
 *        peer actor cannot narrow from it. each actor narrows from this union instead — the same
 *        set the hook sync computes, by the same adapter. it lives beside the hook sync, the one
 *        context that owns how a role's hooks render
 *
 * .note = a role whose discovery faults fails the union loud: a silent absence would hand an
 *   actor's clones a settings file short of that role's hooks, with no signal
 * .note = no claude adapter installed → no claude hooks, so the union is empty
 */
export const getAllHooksOfLinkedRolesForClaudeCode = async (input: {
  repoPath: string;
}): Promise<NonNullable<ClaudeCodeSettings['hooks']>> => {
  const context = new ContextCli({
    cwd: input.repoPath,
    gitroot: input.repoPath,
  });

  // the claude brain this repo has an adapter for, if any
  const brainsClaude = (await getBrainsDetectedAndSupplied(context)).filter(
    (brain) => isBrainClaudeCode({ brain }),
  );
  if (brainsClaude.length === 0) return {};

  // the linked roles that declare hooks; a role that could not be discovered fails loud
  const { roles, errors } = await getLinkedRolesWithHooks(context);
  if (errors.length > 0)
    throw new MalfunctionError(
      'a linked role could not be read for its hooks',
      {
        roles: errors.map(
          (one) => `${one.repoSlug}/${one.roleSlug} [${one.phase}]`,
        ),
        cause: errors[0]?.error,
        hint: 'run `rhx init --hooks` to see each fault, then repair or unlink the role',
      },
    );
  if (roles.length === 0) return {};

  // render every role's hooks into a scratch dir, and read the union back
  return withScratchDir(
    { prefix: 'rhachet-hooks-union-' },
    async (scratchDir) => {
      await syncAllRoleHooksIntoEachBrainRepl(
        { roles, brains: brainsClaude, configTargetDir: scratchDir },
        context,
      );
      const settings = await readClaudeCodeSettings({ from: scratchDir });
      return settings.hooks ?? {};
    },
  );
};
