import type { Command } from 'commander';

import { bootRoleResources } from '@src/domain.operations/invoke/bootRoleResources';

import { asSubjectFlagValues } from './asSubjectFlagValues';
import { getAllSubjectSlugs } from './getAllSubjectSlugs';
import { getOneBootSourceRequest } from './getOneBootSourceRequest';

/**
 * .what = adds the "roles boot" subcommand to the CLI
 * .why = outputs role resources (briefs and skills) with stats for context load
 * .how = resolves repo and role via .agent/ scan, then delegates to bootRoleResources
 */
export const invokeRolesBoot = ({ command }: { command: Command }): void => {
  command
    .command('boot')
    .description('boot context from role resources (briefs and skills)')
    .option('--repo <slug>', 'the repository slug for the role')
    .option('--role <slug>', 'the role to boot resources for')
    // 🔴 .note = TWO flags, one option. commander reads the LAST as the long form, so `--what`
    //   is primary and `opts.what` is the key; `--manifest` is a live alias of the same path
    .option(
      '--manifest, --what <path>',
      'boot from a declared boot.yml instead of a role default',
    )
    .option('--if-present', 'exit silently where the role dir is absent')
    .option(
      '--subject <slugs>',
      'boot specific subjects (comma-separated or repeated, subject mode only)',
      asSubjectFlagValues,
    )
    .action(
      async (opts: {
        repo?: string;
        role?: string;
        what?: string;
        ifPresent?: boolean;
        subject?: string[];
      }) => {
        const subjects = getAllSubjectSlugs({ raw: opts.subject });

        // one owner for the whole flag contract — `roles cost` calls the same resolver, so
        // neither command can drift from the other's refusals
        const request = getOneBootSourceRequest({ opts });

        // the one cause of a null: a role this repo never linked, under --if-present
        if (!request) {
          console.log(`🫧 role not present, skipped`);
          return;
        }

        await bootRoleResources({ ...request, subjects });
      },
    );
};
