import type { HelpfulError } from 'helpful-errors';

import {
  RoleModdedViewRecord,
  type RoleModdedViewSource,
} from '@src/domain.objects/RoleModdedViewRecord';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { asRoleModdedViewRecordPath } from './asRoleModdedViewRecordPath';

/**
 * .what = record, in the role dir, that the last render refused its mod
 * .why = a refusal the boot cannot re-derive alone (a hook conflict needs the package, a stray
 *        file needs the swap) must still fail the boot of each actor that carries the role,
 *        and only those (usecase 12)
 *
 * .note = `paths` is the plan's link paths now; a later boot compares its own plan to them, so
 *   a refusal whose mod moved since names the render instead of the old cause
 */
export const setRoleModdedViewRefusal = (input: {
  roleDir: string;
  sources: { briefs: RoleModdedViewSource[]; skills: RoleModdedViewSource[] };
  error: HelpfulError;
  paths: string[];
}): void => {
  // atomic, since every boot reads the record and must never see half of it
  setFileAtomic({
    path: asRoleModdedViewRecordPath({ roleDir: input.roleDir }),
    content: `${JSON.stringify(
      new RoleModdedViewRecord({
        sources: input.sources,
        paths: [],
        hookBasis: null,
        refusal: {
          message: asHelpfulErrorSentence({ error: input.error }),
          metadata: { ...(input.error.metadata ?? {}) },
          paths: [...input.paths].sort(),
        },
      }),
      null,
      2,
    )}\n`,
  });
};

/**
 * .what = a HelpfulError's own sentence, with no `<glyph> <ClassName>: ` lead and no metadata blob
 * .why = the boot re-throws the refusal as a new ConstraintError with the metadata it keeps apart;
 *        the stored full message would print the class lead twice and the metadata twice
 */
const asHelpfulErrorSentence = (input: { error: HelpfulError }): string =>
  input.error
    .redact(['metadata'])
    .message.replace(/^\S+ \w+Error: /, '')
    .trim();
