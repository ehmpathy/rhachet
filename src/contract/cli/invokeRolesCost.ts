import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';
import { inferRepoByRole } from '@src/domain.operations/invoke/inferRepoByRole';
import {
  formatCost,
  formatCostTree,
} from '@src/domain.operations/role/formatCostTree';
import {
  aggregateFileCosts,
  getRoleFileCosts,
} from '@src/domain.operations/role/getRoleFileCosts';

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = adds the "roles cost" subcommand to the CLI
 * .why = outputs role resource costs without loading full file contents
 * .how = reads files in .agent/repo=$repo/role=$role and computes per-file token/cost estimates
 */
export const invokeRolesCost = ({
  command,
  registries,
}: {
  command: Command;
  registries: RoleRegistry[];
}): void => {
  command
    .command('cost')
    .description('show token/cost estimates for role resources')
    .option('--repo <slug>', 'the repository slug for the role')
    .option('--role <slug>', 'the role to analyze')
    .action((opts: { repo?: string; role?: string }) => {
      // validate role is provided
      if (!opts.role)
        BadRequestError.throw('--role is required (e.g., --role mechanic)');

      const slugRole = opts.role;

      // resolve repo from option or inference
      const repo = opts.repo
        ? registries.find((r) => r.slug === opts.repo)
        : inferRepoByRole({ registries, slugRole });
      if (!repo)
        BadRequestError.throw(`No repo found with slug "${opts.repo}"`);

      // build role directory path
      const roleDir = resolve(
        process.cwd(),
        '.agent',
        `repo=${repo.slug}`,
        `role=${slugRole}`,
      );

      // check if role directory exists
      if (!existsSync(roleDir)) {
        BadRequestError.throw(
          `Role directory not found: ${roleDir}\nRun "rhachet roles link --repo ${repo.slug} --role ${slugRole}" first`,
        );
      }

      // get file costs
      const fileCosts = getRoleFileCosts({
        roleDir,
        slugRepo: repo.slug,
        slugRole,
      });

      // handle empty role
      if (fileCosts.length === 0) {
        console.log(``);
        console.log(`⚠️  No resources found in ${roleDir}`);
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
      console.log(`🌊 Role Cost Report: ${slugRole} @ ${repo.slug}`);
      console.log(``);

      // print tree structure with costs
      const rootPath = `.agent/repo=${repo.slug}/role=${slugRole}`;
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
