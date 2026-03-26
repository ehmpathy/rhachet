import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import type { RoleSlug } from '@src/domain.objects/RoleSlug';
import { computeBrainCliEnrollment } from '@src/domain.operations/enroll/computeBrainCliEnrollment';
import { enrollBrainCli } from '@src/domain.operations/enroll/enrollBrainCli';
import { genBrainCliConfigArtifact } from '@src/domain.operations/enroll/genBrainCliConfigArtifact';
import { parseBrainCliEnrollmentSpec } from '@src/domain.operations/enroll/parseBrainCliEnrollmentSpec';

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = extracts all args after 'enroll <brain>' from process.argv
 * .why = captures full arg list for passthrough to brain CLI
 */
const getRawArgsAfterEnroll = (input: { brain: string }): string[] => {
  const argv = process.argv;
  const enrollIdx = argv.indexOf('enroll');
  if (enrollIdx === -1) return [];

  // skip 'enroll' and the brain argument
  const argsAfterEnroll = argv.slice(enrollIdx + 1);

  // find brain position (should be first non-flag arg)
  const brainIdx = argsAfterEnroll.findIndex((arg) => arg === input.brain);
  if (brainIdx === -1) return argsAfterEnroll;

  // return everything after the brain arg
  return argsAfterEnroll.slice(brainIdx + 1);
};

/**
 * .what = scans .agent/ to discover linked role slugs
 * .why = filesystem-only role discovery for enroll command
 *
 * .note = scans both repo=.this and repo=* directories
 * .note = returns unique list of role slugs
 */
const getLinkedRoleSlugs = (input: { gitroot: string }): RoleSlug[] => {
  const agentDir = join(input.gitroot, '.agent');

  if (!existsSync(agentDir)) {
    return [];
  }

  const roleSlugs: RoleSlug[] = [];
  const seen = new Set<string>();

  // scan for repo=* directories
  const repoDirs = readdirSync(agentDir).filter((name) =>
    name.startsWith('repo='),
  );

  for (const repoDir of repoDirs) {
    const repoPath = join(agentDir, repoDir);

    // scan for role=* directories within this repo
    const roleDirs = readdirSync(repoPath).filter((name) =>
      name.startsWith('role='),
    );

    for (const roleDir of roleDirs) {
      const roleSlug = roleDir.replace('role=', '');
      if (!seen.has(roleSlug)) {
        seen.add(roleSlug);
        roleSlugs.push(roleSlug);
      }
    }
  }

  return roleSlugs;
};

/**
 * .what = performs enrollment with specified roles
 * .why = generates dynamic config and spawns brain CLI
 */
const performEnroll = async (input: {
  brain: string;
  roles: string;
  gitroot: string;
}): Promise<void> => {
  const { brain, roles: rolesSpec, gitroot } = input;

  // discover linked roles from .agent/
  const rolesLinked = getLinkedRoleSlugs({ gitroot });

  if (rolesLinked.length === 0) {
    throw new BadRequestError(
      'no roles found in .agent/. run "rhachet roles link" first to link roles.',
      { gitroot },
    );
  }

  // by default, all linked roles are the default roles
  const rolesDefault = rolesLinked;

  // --roles is required, so rolesSpec should always be defined
  if (rolesSpec === undefined) {
    throw new BadRequestError(
      '--roles is required. specify roles to enroll (e.g., --roles mechanic)',
      { brain },
    );
  }

  // parse the roles spec (will error if empty string)
  const spec = parseBrainCliEnrollmentSpec({ spec: rolesSpec });

  // compute final roles from spec
  const enrollment = computeBrainCliEnrollment({
    brain,
    spec,
    rolesDefault,
    rolesLinked,
  });

  // generate dynamic config
  const { configPath } = await genBrainCliConfigArtifact({
    enrollment,
    repoPath: gitroot,
  });

  // get passthrough args (all args after 'enroll <brain>')
  const rawArgs = getRawArgsAfterEnroll({ brain });

  // filter out --roles from passthrough
  const passthroughArgs = filterOutRolesArg({ args: rawArgs });

  // spawn brain CLI
  enrollBrainCli({
    brain: enrollment.brain,
    configPath,
    args: passthroughArgs,
    cwd: gitroot,
  });
};

/**
 * .what = removes --roles and its value from args
 * .why = --roles is consumed by enroll, not passed to brain
 */
const filterOutRolesArg = (input: { args: string[] }): string[] => {
  const result: string[] = [];
  let skipNext = false;

  for (const arg of input.args) {
    if (skipNext) {
      skipNext = false;
      continue;
    }

    if (arg === '--roles' || arg === '-r') {
      skipNext = true;
      continue;
    }

    if (arg.startsWith('--roles=')) {
      continue;
    }

    result.push(arg);
  }

  return result;
};

/**
 * .what = adds the "enroll" command to the CLI
 * .why = spawns brain CLI with customized role enrollment
 *
 * .note = --roles spec: mechanic (replace), +architect (append), -driver (subtract)
 * .note = all other args pass through to brain CLI
 */
export const invokeEnroll = ({ program }: { program: Command }): void => {
  program
    .command('enroll <brain>')
    .description('enroll a brain CLI with customized roles')
    .requiredOption(
      '-r, --roles <spec>',
      'roles to enroll (e.g., mechanic, +architect, -driver)',
    )
    .helpOption(false) // disable built-in --help so it passes through to brain
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(async (brain: string, opts: { roles: string }) => {
      const gitroot = process.cwd();

      // check if .agent/ exists
      const agentDir = join(gitroot, '.agent');
      if (!existsSync(agentDir)) {
        throw new BadRequestError(
          'no .agent/ found. run "rhachet roles link" first to initialize.',
          { gitroot },
        );
      }

      await performEnroll({
        brain,
        roles: opts.roles,
        gitroot,
      });
    });
};
