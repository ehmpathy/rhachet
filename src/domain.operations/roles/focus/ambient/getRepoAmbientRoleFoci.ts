import { MalfunctionError } from 'helpful-errors';
import { z } from 'zod';

import { getRepoAmbientRoleFociPath } from '@src/domain.operations/actor/enrolled/getRepoAmbientRoleFociPath';

import { readFileSync, statSync } from 'node:fs';

/**
 * .what = the shape of the ambient role foci record — each focused role, with its subjects
 * .note = a role absent from the record is ambient whole
 */
const schemaRepoAmbientRoleFoci = z.record(z.string(), z.array(z.string()));

/**
 * .what = read the subjects each ambient role is focused on
 * .why = the repo actor's render and every enroll read the ambient roleset from one record
 *
 * .note = only an absent record means no ambient focus. the probe is `statSync` with
 *   `throwIfNoEntry: false`, never `existsSync`, so a record that cannot be probed raises rather
 *   than boot every role whole (`define.statsync-and-lstatsync-suppress-different-errnos`)
 * .note = a record that is not json, or not the shape, fails loud with its cause and the one
 *   fix that works: every `rhx init --roles` reads this record first, so it cannot rewrite it
 * .note = a read fault (EACCES, EMFILE) raises raw, unshaped: the shaped hint (repair or remove
 *   the file) is the wrong advice for it, and the errno names its own cause
 */
export const getRepoAmbientRoleFoci = (input: {
  repoPath: string;
}): Record<string, string[]> => {
  const path = getRepoAmbientRoleFociPath({ repoPath: input.repoPath });
  if (!statSync(path, { throwIfNoEntry: false })) return {};

  // the fix a corrupt record names: repair or remove the file, then init again
  const hint = `repair ${path} to the shape {"<role>":["<subject>"]}, or remove it to boot every ambient role whole; then rerun \`rhx init --roles <roles>\``;

  // parse the record as json; a syntax fault names the file, the fix and its cause
  const content = readFileSync(path, 'utf8');
  const json = (() => {
    try {
      return JSON.parse(content) as unknown;
    } catch (error) {
      throw new MalfunctionError('ambient role foci record is not json', {
        path,
        hint,
        cause: error instanceof Error ? error : undefined,
      });
    }
  })();

  // validate the shape; a wrong one names each issue zod found
  const parsed = schemaRepoAmbientRoleFoci.safeParse(json);
  if (!parsed.success)
    throw new MalfunctionError('ambient role foci record has the wrong shape', {
      path,
      hint,
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`,
      ),
    });
  return parsed.data;
};
