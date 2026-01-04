import type { Command } from 'commander';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import { findUniqueRoleDir } from '@src/domain.operations/invoke/findUniqueRoleDir';
import {
  formatCost,
  formatCostTree,
} from '@src/domain.operations/role/formatCostTree';
import {
  aggregateFileCosts,
  getRoleFileCosts,
} from '@src/domain.operations/role/getRoleFileCosts';

import { existsSync } from 'node:fs';

/**
 * .what = adds the "roles cost" subcommand to the CLI
 * .why = outputs role resource costs without full file content load
 * .how = reads files in .agent/repo=$repo/role=$role and computes per-file token/cost estimates
 */
export const invokeRolesCost = ({ command }: { command: Command }): void => {
  command
    .command('cost')
    .description('show token/cost estimates for role resources')
    .option('--repo <slug>', 'the repository slug for the role')
    .option('--role <slug>', 'the role to analyze')
    .option(
      '--if-present',
      'exit silently if role directory does not exist (no error)',
    )
    .action((opts: { repo?: string; role?: string; ifPresent?: boolean }) => {
      // validate role is provided
      if (!opts.role)
        BadRequestError.throw('--role is required (e.g., --role mechanic)');

      // discover role dir from .agent/
      const roleFound = findUniqueRoleDir({
        slugRepo: opts.repo,
        slugRole: opts.role,
        ifPresent: opts.ifPresent,
      });

      // skip if role not found and --if-present
      if (!roleFound) {
        if (!opts.ifPresent)
          throw new UnexpectedCodePathError(
            'roleFound null without ifPresent',
            {
              opts,
            },
          );
        console.log(`🫧 role not present, skipped`);
        return;
      }

      // check if role directory exists
      if (!existsSync(roleFound.roleDir)) {
        if (opts.ifPresent) {
          console.log(`🫧 role not present, skipped`);
          return;
        }
        BadRequestError.throw(
          `Role directory not found: ${roleFound.roleDir}\nRun "rhachet roles link --repo ${roleFound.slugRepo} --role ${roleFound.slugRole}" first`,
        );
      }

      // get file costs
      const fileCosts = getRoleFileCosts({
        roleDir: roleFound.roleDir,
        slugRepo: roleFound.slugRepo,
        slugRole: roleFound.slugRole,
      });

      // handle empty role
      if (fileCosts.length === 0) {
        console.log(``);
        console.log(`⚠️  No resources found in ${roleFound.roleDir}`);
        console.log(``);
        return;
      }

      // aggregate costs
      const summary = aggregateFileCosts(fileCosts);

      // format cost for display
      const costFormatted =
        summary.totalCost < 0.01 ? `< $0.01` : formatCost(summary.totalCost);

      // print header
      console.log(``);
      console.log(
        `🌊 Role Cost Report: ${roleFound.slugRole} @ ${roleFound.slugRepo}`,
      );
      console.log(``);

      // print tree structure with costs
      const rootPath = `.agent/repo=${roleFound.slugRepo}/role=${roleFound.slugRole}`;
      const tree = formatCostTree({ fileCosts, rootPath });
      console.log(tree);
      console.log(``);

      // print summary
      console.log(`Summary:`);
      console.log(`  ├── files = ${summary.totalFiles}`);
      console.log(`  │   ├── briefs = ${summary.briefFiles}`);
      console.log(`  │   ├── skills = ${summary.skillFiles}`);
      console.log(`  │   └── other = ${summary.otherFiles}`);
      console.log(
        `  ├── chars = ${summary.totalChars.toLocaleString('en-US')}`,
      );
      console.log(
        `  └── tokens ≈ ${summary.totalTokens.toLocaleString('en-US')} (${costFormatted} at $3/mil)`,
      );
      console.log(``);

      // print top 10 token sources
      const top10 = [...fileCosts]
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 10);

      console.log(`Top 10 Token Sources:`);
      top10.forEach((file, index) => {
        const isLast = index === top10.length - 1;
        const prefix = isLast ? '└──' : '├──';
        const tokens = file.tokens.toLocaleString('en-US');
        const cost = formatCost(file.cost);
        const pct = ((file.tokens / summary.totalTokens) * 100).toFixed(1);
        const fileName = file.relativePath.split('/').pop();
        const docsOnly = file.isDocsOnly ? ' [docs only]' : '';
        console.log(
          `  ${prefix} ${tokens} tokens (${pct}%) ${fileName}${docsOnly}`,
        );
      });
      console.log(``);
    });
};
