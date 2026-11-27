import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { asRoleModRefusalError } from './asRoleModRefusalError';

/**
 * .what = every hook command a linked role declares, on each brain event
 * .why = a `not` of a skill one of these invokes is refused (usecase 9); the sync and the stop
 *        sweep each check it, against the same read
 *
 * .note = only this role's package loads, and only once a mod nots a skill, so most callers pay
 *   naught; the narrow brains reader is a lazy import for the same reason
 *   (`rule.require.thinnest-import-path`)
 * .note = a package that fails to load is a refusal, never an empty list: with no hooks to
 *   read, a `not` of a hooked skill would pass and the hook would fail at its next event
 */
export const getAllRoleModHookCommands = async (
  input: { ref: RoleLinkRef },
  context: ContextCli,
): Promise<string[]> => {
  const { getAllHookCommandsForRole } = await import(
    '@src/domain.operations/brains/getAllHookCommandsForRole'
  );
  const { commands, error } = await getAllHookCommandsForRole({
    ref: input.ref,
    gitroot: context.gitroot,
  });

  // the hooks of a role whose package did not load cannot be read
  if (error)
    throw asRoleModRefusalError({
      role: input.ref.role,
      problem:
        'its package did not load, so no hook can be checked against a not of a skill',
      subject: error.message,
      nearest: null,
      fix: 'repair the install (pnpm install), or drop each not of a skills/ path',
    });
  return commands;
};
