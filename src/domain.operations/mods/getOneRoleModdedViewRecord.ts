import { MalfunctionError } from 'helpful-errors';

import { RoleModdedViewRecord } from '@src/domain.objects/RoleModdedViewRecord';
import { getFileContentOrNull } from '@src/infra/filesystem/getFileContentOrNull';

import { basename, dirname } from 'node:path';
import { asRoleModdedViewRecordPath } from './asRoleModdedViewRecordPath';

/**
 * .what = the modded view record of one role dir, or null where the role is unmodded
 * .why = the record is the view's provenance; every reader of the view reads it one way
 *
 * .note = only an absent file reads as null; an unreadable or malformed record fails loud,
 *   since a view with a lost record cannot be undone
 */
export const getOneRoleModdedViewRecord = (input: {
  roleDir: string;
}): RoleModdedViewRecord | null => {
  const path = asRoleModdedViewRecordPath({ roleDir: input.roleDir });
  const content = getFileContentOrNull({ path });
  if (content === null) return null;

  // the record is written atomically, so a parse fault or an ill shape is a real corruption
  const parsed = ((): unknown => {
    try {
      return JSON.parse(content);
    } catch (error: unknown) {
      throw asRecordUnreadableError({
        path,
        roleDir: input.roleDir,
        problem: error instanceof Error ? error.message : String(error),
      });
    }
  })();
  if (!isRoleModdedViewRecordShape(parsed))
    throw asRecordUnreadableError({
      path,
      roleDir: input.roleDir,
      problem:
        'its shape is not { sources: { briefs, skills }, paths, hookBasis: null | { version }, refusal: null | { message, metadata, paths } }',
    });

  // a record with no hookBasis carries no hook check, so it reads as null; a view that now
  //   `not`s a skill is then stale, and the check runs again
  return new RoleModdedViewRecord({
    ...parsed,
    hookBasis: parsed.hookBasis ?? null,
  });
};

/**
 * .what = whether a parsed record has the shape the view reads
 * .why = a well-formed json of the wrong shape would otherwise escape as a raw TypeError
 */
const isRoleModdedViewRecordShape = (
  value: unknown,
): value is RoleModdedViewRecord => {
  const record = value as Partial<RoleModdedViewRecord> | null;
  return (
    typeof record === 'object' &&
    record !== null &&
    Array.isArray(record.sources?.briefs) &&
    Array.isArray(record.sources?.skills) &&
    Array.isArray(record.paths) &&
    isRoleModdedViewHookBasisShape({ value: record.hookBasis }) &&
    isRoleModdedViewRefusalShape({ value: record.refusal })
  );
};

/**
 * .what = whether a parsed record's hookBasis is absent, null, or `{ version: string | null }`
 * .why = the sync and the boot compare `hookBasis.version`; any other shape is a corruption
 */
const isRoleModdedViewHookBasisShape = (input: { value: unknown }): boolean => {
  if (input.value === undefined || input.value === null) return true;
  const basis = input.value as { version?: unknown };
  return (
    typeof basis === 'object' &&
    (basis.version === null || typeof basis.version === 'string')
  );
};

/**
 * .what = whether a parsed record's refusal is null, or `{ message, metadata, paths }`
 * .why = a boot reads `refusal.message`, `.metadata` and `.paths`; a refusal of any other shape
 *        would escape the boot as a raw TypeError, not as this record's own corruption
 */
const isRoleModdedViewRefusalShape = (input: { value: unknown }): boolean => {
  if (input.value === null) return true;
  const refusal = input.value as Partial<
    NonNullable<RoleModdedViewRecord['refusal']>
  > | null;
  return (
    typeof refusal === 'object' &&
    refusal !== null &&
    typeof refusal.message === 'string' &&
    typeof refusal.metadata === 'object' &&
    refusal.metadata !== null &&
    !Array.isArray(refusal.metadata) &&
    Array.isArray(refusal.paths)
  );
};

/**
 * .what = the error for a record that cannot be read, with a fix a human can run as printed
 * .why = the role dir names its repo and role, so the fix can name them too
 */
const asRecordUnreadableError = (input: {
  path: string;
  roleDir: string;
  problem: string;
}): MalfunctionError<{ path: string; problem: string; fix: string }> => {
  const repo = basename(dirname(input.roleDir)).replace(/^repo=/, '');
  const role = basename(input.roleDir).replace(/^role=/, '');
  return new MalfunctionError('the modded view record is unreadable', {
    path: input.path,
    problem: input.problem,
    fix: `delete ${input.path}, then run rhx init --roles +${repo}/${role} to re-link the role`,
  });
};
