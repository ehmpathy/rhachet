import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';
import { getGitRepoRoot } from 'rhachet-artifact-git';

import type { RoleRegistry } from '../../domain/objects/RoleRegistry';
import { inferRepoByRole } from '../../logic/invoke/inferRepoByRole';

/**
 * .what = extracts documentation from a skill file without showing implementation
 * .why = agents should understand what skills do, not how they do it
 * .how = reads file and extracts only comments/documentation at the top
 */
const extractSkillDocumentation = (filepath: string): string => {
  const content = readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');
  const docLines: string[] = [];

  // Extract shebang and leading comments/documentation
  for (const line of lines) {
    const trimmed = line.trim();

    // Include shebang
    if (trimmed.startsWith('#!')) {
      docLines.push(line);
      continue;
    }

    // Include comment lines (shell, python, etc)
    if (
      trimmed.startsWith('#') ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('*')
    ) {
      docLines.push(line);
      continue;
    }

    // Stop at first non-comment, non-blank line
    if (trimmed !== '') {
      break;
    }

    // Include blank lines between comments
    docLines.push(line);
  }

  // If we got some documentation, add a note about implementation being hidden
  if (docLines.length > 0) {
    docLines.push('');
    docLines.push('# [implementation hidden - use skill to execute]');
  } else {
    docLines.push('# [no documentation found]');
    docLines.push('# [implementation hidden - use skill to execute]');
  }

  return docLines.join('\n');
};

/**
 * .what = adds the "roles boot" subcommand to the CLI
 * .why = outputs role resources (briefs and skills) with stats for context loading
 * .how = reads all files in .agent/repo=$repo/role=$role and prints them with formatting
 */
export const invokeRolesBoot = ({
  command,
  registries,
}: {
  command: Command;
  registries: RoleRegistry[];
}): void => {
  command
    .command('boot')
    .description('boot context from role resources (briefs and skills)')
    .option('--repo <slug>', 'the repository slug for the role')
    .option('--role <slug>', 'the role to boot resources for')
    .action(async (opts: { repo?: string; role?: string }) => {
      if (!opts.role)
        BadRequestError.throw('--role is required (e.g., --role mechanic)');

      const roleSlug = opts.role;
      const repo = opts.repo
        ? registries.find((r) => r.slug === opts.repo)
        : inferRepoByRole({ registries, roleSlug });
      if (!repo)
        BadRequestError.throw(`No repo found with slug "${opts.repo}"`);

      const roleDir = resolve(
        process.cwd(),
        '.agent',
        `repo=${repo.slug}`,
        `role=${roleSlug}`,
      );
      const gitRoot = await getGitRepoRoot({ from: roleDir });

      // Check if role directory exists
      if (!existsSync(roleDir)) {
        BadRequestError.throw(
          `Role directory not found: ${roleDir}\nRun "rhachet roles link --repo ${repo.slug} --role ${roleSlug}" first`,
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

      const allFiles = getAllFiles(roleDir).sort();

      if (allFiles.length === 0) {
        console.log(``);
        console.log(`⚠️  No resources found in ${roleDir}`);
        console.log(``);
        return;
      }

      // Separate files by type
      const briefsDir = resolve(roleDir, 'briefs');
      const skillsDir = resolve(roleDir, 'skills');

      const briefFiles = allFiles.filter((f) => f.startsWith(briefsDir));
      const skillFiles = allFiles.filter((f) => f.startsWith(skillsDir));
      const otherFiles = allFiles.filter(
        (f) => !f.startsWith(briefsDir) && !f.startsWith(skillsDir),
      );

      // Count total characters and approximate tokens
      let totalChars = 0;
      for (const filepath of allFiles) {
        const isSkill = filepath.startsWith(skillsDir);

        if (isSkill) {
          // For skills, only count documentation
          const doc = extractSkillDocumentation(filepath);
          totalChars += doc.length;
        } else {
          // For other files, count full content
          const content = readFileSync(filepath, 'utf-8');
          totalChars += content.length;
        }
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
        console.log(`    ├── files = ${allFiles.length}`);
        console.log(`    │   ├── briefs = ${briefFiles.length}`);
        console.log(`    │   ├── skills = ${skillFiles.length}`);
        console.log(`    │   └── other = ${otherFiles.length}`);
        console.log(`    ├── chars = ${totalChars}`);
        console.log(
          `    └── tokens ≈ ${approxTokens} (${costFormatted} at $3/mil)`,
        );
        console.log('');
        console.log('  treestruct');
        const treeOutput = execSync(`tree -l ${roleDir}`, {
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
        console.log(`    ├── files = ${allFiles.length}`);
        console.log(`    │   ├── briefs = ${briefFiles.length}`);
        console.log(`    │   ├── skills = ${skillFiles.length}`);
        console.log(`    │   └── other = ${otherFiles.length}`);
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
      for (const filepath of allFiles) {
        const relativePath = `.agent/repo=${repo.slug}/role=${roleSlug}/${relative(
          roleDir,
          filepath,
        )}`;
        const isSkill = filepath.startsWith(skillsDir);

        console.log('#####################################################');
        console.log('#####################################################');
        console.log('#####################################################');
        console.log(`## began:${relativePath}`);
        console.log('#####################################################');
        console.log('');

        // Get content based on file type
        const content = isSkill
          ? extractSkillDocumentation(filepath)
          : readFileSync(filepath, 'utf-8');

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
