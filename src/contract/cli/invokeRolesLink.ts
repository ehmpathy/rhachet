import type { Command } from 'commander';
import { ConstraintError } from 'helpful-errors';

import { genContextCli } from '@src/domain.objects/ContextCli';
import type { ContextConfigOfUsage } from '@src/domain.operations/config/ContextConfigOfUsage';
import { syncAndReportBrainDirBoots } from '@src/domain.operations/init/boots/syncAndReportBrainDirBoots';
import { getRoleBySpecifier } from '@src/domain.operations/invoke/getRoleBySpecifier';
import { execRoleLink } from '@src/domain.operations/invoke/link/execRoleLink';

/**
 * .what = adds the "roles link" subcommand to the CLI
 * .why = creates .agent/ directory structure and links role resources
 * .how = delegates to execRoleLink for shared link logic
 *
 * .note = uses getRoleBySpecifier for unified explicit/implicit resolution
 */
export const invokeRolesLink = (
  { command }: { command: Command },
  context: ContextConfigOfUsage,
): void => {
  command
    .command('link')
    .description('link role resources into .agent/ directory structure')
    .option('--repo <slug>', 'the repository slug for the role')
    .option('--role <slug>', 'the role to link resources for')
    .action(async (opts: { repo?: string; role?: string }) => {
      if (!opts.role)
        ConstraintError.throw('--role is required (e.g., --role mechanic)');

      // resolve role via unified lookup
      const resolved = await getRoleBySpecifier(
        { role: opts.role, repo: opts.repo },
        context,
      );

      // construct cli context for link operations
      const contextCli = await genContextCli({ cwd: process.cwd() });

      console.log(``);
      // `execRoleLink` already closes its block with one blank line, so the brain dir
      // report that follows opens with exactly one — the same separation every other
      // render of a `🧠 brain dir` tree uses (`rule.forbid.snapshot-visual-blemishes`). a
      // second `console.log('')` here rendered TWO, and only on this path
      execRoleLink({ role: resolved.role, repo: resolved.repo }, contextCli);

      // re-render every corpus the linked set feeds, after the link lands
      const { exitCode } = await syncAndReportBrainDirBoots(
        { repoPath: contextCli.gitroot, env: process.env },
        contextCli,
      );

      // a link reaches the default and the actors that hold the role; it adds the role to no
      //   actor, so the human is told the one command that would
      //
      // 🌊 the shape is the house tip block — a glyph root plus one leaf
      //   (`rule.require.treestruct-output`, as `clone list` renders its prune tip). a bare
      //   one-liner wedged flush under the brain-dir tree's last leaf read as a fourth branch
      //   of that tree rather than as advice about the link. the tree above closes on its own
      //   blank line, so this block opens flush and closes on one, like its neighbours
      console.log(`💡 tip`);
      console.log(
        `   └─ an enrolled actor gains this role via \`rhx enroll --roles +${resolved.role.slug}\``,
      );
      console.log(``);
      if (exitCode !== 0) process.exit(exitCode);
    });
};
