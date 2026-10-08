import { ConstraintError } from 'helpful-errors';

import { findUniqueRoleDir } from '@src/domain.operations/invoke/findUniqueRoleDir';

/**
 * .what = the boot source a cli invocation names, once its flags are validated
 * .why = `from` is the discriminated union every downstream reader already takes, so the
 *        resolver hands back exactly that pair rather than a third shape each caller unwraps
 *
 * .note = `null` has ONE cause — a role this repo never linked, tolerated by `--if-present`.
 *   every other absence throws, so a caller that sees `null` knows the cause without a probe.
 */
export type BootSourceRequest = {
  from:
    | { manifest: { path: string } }
    | { role: { slugRepo: string; slugRole: string } };
  ifPresent: boolean;
} | null;

/**
 * .what = the shared `--what` / `--repo` / `--role` / `--if-present` contract, for every
 *         command that boots or measures a boot payload
 * .why = `roles boot` and `roles cost` name one payload, so they owe one flag contract, with
 *        one owner
 *
 * .note = every command that boots or measures a payload calls this, never a copy of it
 */
export const getOneBootSourceRequest = (input: {
  opts: {
    repo?: string;
    role?: string;
    what?: string;
    ifPresent?: boolean;
  };
}): BootSourceRequest => {
  const { opts } = input;

  // the caller named the spec, so no role coordinate is consulted
  if (opts.what !== undefined) {
    // a source is one or the other — a boot cannot take its spec from two places
    if (opts.role || opts.repo)
      ConstraintError.throw('--what cannot be used with --role/--repo', {
        what: opts.what,
        repo: opts.repo,
        role: opts.role,
        hint: 'use one source: --what <path>, or --repo/--role',
      });

    // --if-present exists to tolerate a role that is not linked here. a declared spec is ONE
    // path the caller chose, so there is no set to be tolerant across — and tolerance would
    // convert a typo into an empty payload rather than an error (requirement 5)
    if (opts.ifPresent)
      ConstraintError.throw(
        '--what cannot be used with --if-present — an explicit path that points at no file is an error',
        {
          what: opts.what,
          hint: 'drop --if-present, or point --what at a file',
        },
      );

    // commander yields `true` for a value-less flag, so an absent value is caught here
    if (typeof opts.what !== 'string' || opts.what.trim() === '')
      ConstraintError.throw('--what requires a path', {
        what: opts.what,
        hint: 'pass the spec path, e.g. --what .agent/repo=.this/role=any/boot.yml',
      });

    return { from: { manifest: { path: opts.what } }, ifPresent: false };
  }

  if (!opts.role)
    ConstraintError.throw('--role is required (e.g., --role mechanic)', {
      hint: 'pass --role <slug>, or --what <path> to boot a spec',
    });

  // a `--repo` may be omitted; `--if-present` tolerates a role this repo never linked
  const roleDir = findUniqueRoleDir({
    slugRepo: opts.repo,
    slugRole: opts.role,
    ifPresent: opts.ifPresent,
  });
  if (!roleDir) return null;

  return {
    from: { role: { slugRepo: roleDir.slugRepo, slugRole: roleDir.slugRole } },
    ifPresent: opts.ifPresent ?? false,
  };
};
