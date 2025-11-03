import { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { getGitRepoRoot } from 'rhachet-artifact-git';

/**
 * .what = adds the "briefs boot" subcommand to the CLI
 * .why = outputs all brief files with stats for context loading
 * .how = reads all files in .briefs/<role> and prints them with formatting and statistics
 */
export const invokeBriefsBoot = ({ command }: { command: Command }): void => {
  command
    .command('boot')
    .description('boot context from role briefs (print all brief files)')
    .option('--role <slug>', 'the role to boot briefs for')
    .action(async (opts: { role?: string }) => {
      if (!opts.role)
        BadRequestError.throw('--role is required (e.g., --role mechanic)');

      const role = opts.role;
      const briefsDir = resolve(process.cwd(), '.briefs', role);
      const gitRoot = await getGitRepoRoot({ from: briefsDir });

      // Check if briefs directory exists
      if (!existsSync(briefsDir)) {
        BadRequestError.throw(
          `Briefs directory not found: ${briefsDir}\nRun "rhachet briefs link --role ${role}" first`,
        );
      }

      // Recursively read all files, including those in symlinked directories
      const getAllFiles = (dir: string): string[] => {
        const entries = readdirSync(dir);
        const files: string[] = [];

        for (const entry of entries) {
          const fullPath = resolve(dir, entry);
          const stats = statSync(fullPath); // statSync follows symlinks

          if (stats.isDirectory()) {
            // Recursively traverse directories (including symlinked ones)
            files.push(...getAllFiles(fullPath));
          } else if (stats.isFile()) {
            files.push(fullPath);
          }
        }

        return files;
      };

      const files = getAllFiles(briefsDir).sort();

      if (files.length === 0) {
        console.log(``);
        console.log(`⚠️  No briefs found in ${briefsDir}`);
        console.log(``);
        return;
      }

      // Count total characters and approximate tokens
      let totalChars = 0;
      for (const filepath of files) {
        const content = readFileSync(filepath, 'utf-8');
        totalChars += content.length;
      }
      const approxTokens = Math.ceil(totalChars / 4);
      const costPerMillionTokens = 3; // $3 per million tokens
      const approxCost = (approxTokens / 1_000_000) * costPerMillionTokens;
      const costFormatted =
        approxCost < 0.01
          ? `< $0.01`
          : `$${approxCost.toFixed(2).replace(/\.?0+$/, '')}`;

      // Print stats helper
      const printStats = () => {
        console.log('#####################################################');
        console.log('#####################################################');
        console.log('#####################################################');
        console.log('## began:stats');
        console.log('#####################################################');
        console.log('');
        console.log('  quant');
        console.log(`    ├── files = ${files.length}`);
        console.log(`    ├── chars = ${totalChars}`);
        console.log(
          `    └── tokens ≈ ${approxTokens} (${costFormatted} at $3/mil)`,
        );
        console.log('');
        console.log('  treestruct');
        const treeOutput = execSync(`tree -l ${briefsDir}`, {
          encoding: 'utf-8',
        })
          .split('\n')
          .map((line) => line.replace(/ -> .*$/, ''))
          .map((line) => line.replace(gitRoot, '@gitroot'))
          .filter((line) => !line.match(/^\s*\d+\s+director(y|ies),/))
          .filter((line) => line.trim() !== '')
          .map((line) => `    ${line}`)
          .join('\n');
        console.log(treeOutput);
        console.log('');
        console.log('  quant');
        console.log(`    ├── files = ${files.length}`);
        console.log(`    ├── chars = ${totalChars}`);
        console.log(
          `    └── tokens ≈ ${approxTokens} (${costFormatted} at $3/mil)`,
        );
        console.log('');
        console.log('#####################################################');
        console.log('## ended:stats');
        console.log('#####################################################');
        console.log('#####################################################');
        console.log('#####################################################');
        console.log('');
      };

      // Print stats header
      printStats();

      // Print each file
      for (const filepath of files) {
        const content = readFileSync(filepath, 'utf-8');
        const relativePath = `.briefs/${role}/${relative(briefsDir, filepath)}`;

        console.log('#####################################################');
        console.log('#####################################################');
        console.log('#####################################################');
        console.log(`## began:${relativePath}`);
        console.log('#####################################################');
        console.log('');

        // Print content with indentation
        const indentedContent = content
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n');
        console.log(indentedContent);

        console.log('');
        console.log('#####################################################');
        console.log(`## ended:${relativePath}`);
        console.log('#####################################################');
        console.log('#####################################################');
        console.log('#####################################################');
        console.log('');
      }

      // Print stats footer
      printStats();
    });
};
