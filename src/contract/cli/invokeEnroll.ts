import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import type { RoleSlug } from '@src/domain.objects/RoleSlug';
import { computeBrainCliEnrollment } from '@src/domain.operations/enroll/computeBrainCliEnrollment';
import { enrollBrainCli } from '@src/domain.operations/enroll/enrollBrainCli';
import { genBrainCliConfigArtifact } from '@src/domain.operations/enroll/genBrainCliConfigArtifact';
import { getRolesSpaceFormCollision } from '@src/domain.operations/enroll/getRolesSpaceFormCollision';
import { parseBrainCliEnrollmentSpec } from '@src/domain.operations/enroll/parseBrainCliEnrollmentSpec';
import { getDecodedRoleDeltaToken } from '@src/domain.operations/roles/deltas/getDecodedRoleDeltaToken';
import { getRoleDeltaTokens } from '@src/domain.operations/roles/deltas/getRoleDeltaTokens';
import { isRolesFlag } from '@src/domain.operations/roles/deltas/isRolesFlag';

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

  // capture the raw args once (used both for the collision guard below and the
  // brain passthrough further down)
  const rawArgs = getRawArgsAfterEnroll({ brain });

  // fail loud on the unquoted multi-delta space form: enroll's `--roles` is
  // single-valued, so a second space-separated role (`--roles -driver -reviewer`)
  // is left raw and commander mangles it into a garbage spec that silently loses
  // the first delta. guide the user to the comma form instead of a misleading
  // "role not found"
  const spaceFormCollision = getRolesSpaceFormCollision({
    rawArgs,
    rolesLinked,
  });
  if (spaceFormCollision)
    throw new BadRequestError(
      `enroll's --roles takes a single spec; saw an extra role token '${spaceFormCollision}' as a separate argument. to enroll multiple roles, separate them with commas (e.g. --roles -driver,-reviewer) or quote the space form (--roles "-driver -reviewer").`,
      // decode the argv sentinel before it reaches the error metadata: this guard
      // throws *before* the tokenizer decodes, so `rolesSpec` is still the encoded
      // form (`\u0000driver`). a raw dump would re-leak the exact `\u0000` artifact
      // this wish exists to eliminate — decode so the human sees `-driver`
      {
        brain,
        rolesSpec: getDecodedRoleDeltaToken({ token: rolesSpec }),
        collision: spaceFormCollision,
      },
    );

  // flatten via the shared tokenizer — accepts both the space form
  // (`--roles "-driver +architect"`) and the comma form (`--roles -driver,+architect`),
  // and decodes the argv sentinel so `-role` survives (fixes the enroll delta regression)
  const tokens = getRoleDeltaTokens({ raw: [rolesSpec] });

  // parse via the one shared `--roles` grammar (errors if no roles specified)
  const spec = parseBrainCliEnrollmentSpec({ tokens });

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

  // filter out --roles from passthrough (rawArgs captured above)
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
const filterOutRolesArg = (input: { args: string[] }): string[] =>
  // fold immutably; the `skipNext` flag marks that the current token is the
  // value of a bare `--roles`/`-r` flag seen on the prior step, so it is dropped
  input.args.reduce<{ result: string[]; skipNext: boolean }>(
    (acc, arg) => {
      // the token right after a bare `--roles`/`-r` flag is its value → drop it
      if (acc.skipNext) return { result: acc.result, skipNext: false };

      // shared predicate — same roles-flag identity used by the argv preprocess,
      // so the two forms (`--roles` / `-r`) never diverge across the two consumers;
      // drop the flag and mark its value (the next token) for drop
      if (isRolesFlag({ token: arg }))
        return { result: acc.result, skipNext: true };

      // the `--roles=value` inline form is one combined token → drop it whole
      if (arg.startsWith('--roles='))
        return { result: acc.result, skipNext: false };

      // any other token passes through to the brain
      return { result: [...acc.result, arg], skipNext: false };
    },
    { result: [], skipNext: false },
  ).result;

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
      'roles to enroll — a single spec (e.g. mechanic, +architect, -driver). for multiple roles use the comma form (--roles -driver,-reviewer) or quote the space form (--roles "-driver -reviewer")',
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
