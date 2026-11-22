import { ConstraintError } from 'helpful-errors';

import type { RoleBootSpec } from '@src/domain.objects/RoleBootSpec';
import { RoleBootSpecSimplified } from '@src/domain.objects/RoleBootSpec';
import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { join, relative } from 'node:path';
import { asRoleDir } from './asRoleDir';
import { getOneRoleBootSpecOrFaultFromPath } from './getOneRoleBootSpecOrFaultFromPath';

/**
 * .what = the boot spec a render uses for one role, plus a `spec-unparsed` defect where its
 *         `boot.yml` will not parse
 * .why = a spec the author broke is content the clone can repair, so it never halts a clone
 *        birth (`rule.forbid.content-checks-that-halt-enroll`). the role renders refs-only:
 *        every brief and skill stays listed by path, and no curated `say` is inflated to say-all
 *
 * .note = only the parse is set aside, by `getOneRoleBootSpecOrFaultFromPath`; a spec that
 *   vanished or that the os refuses to read still raises
 */
export const getOneRoleBootSpecOrDefectFromRef = (input: {
  ref: RoleLinkRef;
  repoPath: string;
}): { spec: RoleBootSpec | null; defect: RoleContentDefect | null } => {
  const pathToSpec = join(
    asRoleDir({ cwd: input.repoPath, ref: input.ref }),
    'boot.yml',
  );
  const { spec, fault } = getOneRoleBootSpecOrFaultFromPath({ pathToSpec });
  if (!fault) return { spec, defect: null };

  // a parse the author must repair sets the role to refs-only
  return {
    spec: genRoleBootSpecRefsOnly(),
    defect: {
      kind: 'spec-unparsed',
      ref: input.ref,
      pathToFile: relative(input.repoPath, pathToSpec),
      detail: asSpecParseDetail({ error: fault }),
    },
  };
};

/**
 * .what = the parse refusal as one line: its headline, plus the precise fix where the refusal
 *         carries one — the yaml parser's own line, or the key the schema expected
 * .why = a receipt row names the fault, never the error class (the set-aside is no refusal);
 *        the parser's line carries where it gave up, and a misnamed key carries its rename
 */
const asSpecParseDetail = (input: { error: ConstraintError }): string => {
  const prefix = `${ConstraintError.emoji} ${ConstraintError.name}: `;
  const headline = (input.error.message.split('\n')[0] ?? '').replace(
    prefix,
    '',
  );
  const precise =
    asParserLineOfFault({ error: input.error }) ??
    asRenameOfFault({ error: input.error });
  return precise ? `${headline} — ${precise}` : headline;
};

/**
 * .what = the yaml parser's first line, with the colon that opened its cut code frame dropped
 */
const asParserLineOfFault = (input: {
  error: ConstraintError;
}): string | null => {
  const line = (
    String(input.error.metadata?.error ?? '').split('\n')[0] ?? ''
  ).replace(/:\s*$/, '');
  return line || null;
};

/**
 * .what = the rename a schema refusal names, where it names the key found and the key expected
 */
const asRenameOfFault = (input: { error: ConstraintError }): string | null => {
  const key = input.error.metadata?.key;
  const expected = input.error.metadata?.expected;
  if (typeof key !== 'string' || typeof expected !== 'string') return null;
  return `rename \`${key}\` to \`${expected}\``;
};

/**
 * .what = a spec that says naught and refs every brief and skill, fresh per call
 * .why = the render of a role whose own spec will not parse: every file stays addressable,
 *        and the role adds no said bytes the budget did not plan for. a fresh instance per
 *        call, so renders that run at once never share one
 */
const genRoleBootSpecRefsOnly = (): RoleBootSpecSimplified =>
  new RoleBootSpecSimplified({
    mode: 'simple',
    briefs: { say: [], ref: [], not: [] },
    skills: { say: [], ref: [], not: [] },
    budget: null,
  });
