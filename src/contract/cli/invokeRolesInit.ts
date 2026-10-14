import type { Command } from 'commander';
import { ConstraintError } from 'helpful-errors';

import type { ContextConfigOfUsage } from '@src/domain.operations/config/ContextConfigOfUsage';
import { getRoleBySpecifier } from '@src/domain.operations/invoke/getRoleBySpecifier';
import { execRoleInits } from '@src/domain.operations/invoke/init/execRoleInits';

/**
 * .what = adds the "roles init" subcommand to the CLI
 * .why = executes role initialization commands after link
 * .how = delegates to execRoleInits for shared init logic
 *
 * .note = for single init execution, use `run --init <slug>` instead
 * .note = uses getRoleBySpecifier for unified explicit/implicit resolution
 * .note = in a git repo, puts the repo actor's brain dir in the split layout BEFORE the inits,
 *   so an init that writes through `<repo>/.claude` meets the layout it lives in — the same
 *   order `rhx init --roles` and `rhx upgrade` run (inventory.of=requirements.case=8)
 */
export const invokeRolesInit = (
  { command }: { command: Command },
  context: ContextConfigOfUsage,
): void => {
  command
    .command('init')
    .description('execute role initialization commands (run-all mode)')
    .option('--repo <slug>', 'the repository slug for the role')
    .option('--role <slug>', 'the role to initialize')
    .action(async (opts: { repo?: string; role?: string }) => {
      if (!opts.role)
        ConstraintError.throw('--role is required (e.g., --role mechanic)');

      // resolve role via unified lookup
      const resolved = await getRoleBySpecifier(
        { role: opts.role, repo: opts.repo },
        context,
      );

      // put the repo actor's brain dir in the split layout before any init writes to it
      //   .note = loaded lazily: only a role with inits, in a git repo, reaches it
      //     (rule.require.thinnest-import-path)
      const hasInits = (resolved.role.inits?.exec ?? []).length > 0;
      if (hasInits) await setRepoActorBrainDirLayoutIfInRepo();

      // execute init commands
      const result = await execRoleInits({
        role: resolved.role,
        repo: resolved.repo,
      });

      // show message if no init commands
      if (result.commandsTotal === 0) {
        console.log(``);
        console.log(
          `⚠️  Role "${resolved.role.slug}" has no initialization commands.`,
        );
        console.log(``);
        return;
      }

      console.log(``);
      console.log(
        `✨ repo=${resolved.repo.slug}/role=${resolved.role.slug} init complete`,
      );
      console.log(``);
    });
};

/**
 * .what = put the repo actor's brain dir in the split layout, when the cwd is in a git repo
 * .why = a role init writes through `<repo>/.claude`; outside a repo there is no repo actor
 *   to lay out, and the cli must tolerate a non-repo cwd (rule.require.cli-tolerates-non-repo-cwd)
 * .note = a layout fault never blocks the inits; the next `rhx init` reports it
 *   (`setRepoActorBrainDirLayoutBeforeInits`)
 */
const setRepoActorBrainDirLayoutIfInRepo = async (): Promise<void> => {
  const { getGitRepoRootOrNull } = await import(
    '../../infra/git/getGitRepoRootOrNull'
  );
  const repoPath = await getGitRepoRootOrNull({ from: process.cwd() });
  if (repoPath === null) return;
  const { setRepoActorBrainDirLayoutBeforeInits } = await import(
    '../../domain.operations/init/boots/setRepoActorBrainDirLayout'
  );
  await setRepoActorBrainDirLayoutBeforeInits({ repoPath });
};
