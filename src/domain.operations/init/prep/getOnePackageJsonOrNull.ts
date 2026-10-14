import { ConstraintError } from 'helpful-errors';

import { asRecordOrNull } from '@src/infra/asRecordOrNull';
import { withAbsentAsNull } from '@src/infra/withAbsentAsNull';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = read and parse the `package.json` in a dir
 * .why = the prep writers each read it; one reader keeps the absent and the invalid
 *        cases alike across them
 *
 * .note = an absent file returns null — the caller decides whether absence is fine
 * .note = an unparseable file fails loud, never reads as `{}`; so does valid json that is
 *   not an object (an array, a scalar), since no prep writer can write scripts into it
 */
export const getOnePackageJsonOrNull = (input: {
  dir: string;
}): { pkgPath: string; pkg: Record<string, unknown> } | null => {
  const pkgPath = join(input.dir, 'package.json');

  // one read, so no peer can remove the file between a probe and the read
  const pkgContent = withAbsentAsNull({
    read: () => readFileSync(pkgPath, 'utf-8'),
  });
  if (pkgContent === null) return null;

  // parse; a syntax fault is the human's to fix
  const parsed: unknown = (() => {
    try {
      return JSON.parse(pkgContent);
    } catch (error) {
      // only a syntax fault is the human's to fix; any other surfaces as it is
      if (!(error instanceof SyntaxError)) throw error;
      throw new ConstraintError('invalid package.json', {
        pkgPath,
        cause: error,
        hint: `open ${pkgPath}, fix the json at the parse error, then rerun`,
      });
    }
  })();

  // narrow to an object — no cast
  const pkg = asRecordOrNull({ value: parsed });
  if (!pkg)
    throw new ConstraintError('invalid package.json — not a json object', {
      pkgPath,
      hint: `open ${pkgPath} and make its top level a json object ({ ... }), then rerun`,
    });
  return { pkgPath, pkg };
};
