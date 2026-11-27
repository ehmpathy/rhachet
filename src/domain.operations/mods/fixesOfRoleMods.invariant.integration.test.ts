import { given, then, when } from 'test-fns';

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = each line of mods prod source that advises a delete or a removal of a mod
 * .why = a brain under a held stop obeys the most specific line it reads; a fix line that offers
 *        a delete with no gate would undo the footer's "ask your human before you delete a mod"
 */
const getAllLinesThatAdviseADelete = (): Array<{
  file: string;
  line: string;
}> =>
  readdirSync(__dirname)
    .filter((name) => name.endsWith('.ts') && !name.includes('.test.'))
    .flatMap((name) =>
      readFileSync(join(__dirname, name), 'utf8')
        .split('\n')
        .filter(
          (line) =>
            !line.trim().startsWith('*') && !line.trim().startsWith('//'),
        )
        .filter((line) => /\b(delete|remove) the (mod|orphan)\b/.test(line))
        .map((line) => ({ file: name, line: line.trim() })),
    );

describe('fixes of role mods', () => {
  given('[case1] the mods prod source', () => {
    when('[t0] each line that advises a delete or a removal is read', () => {
      const lines = getAllLinesThatAdviseADelete();

      then(
        'the scan finds the delete advice it guards, so it is not vacuous',
        () => {
          expect(lines.length).toBeGreaterThan(0);
        },
      );

      then("🔴 each one gates the delete on the human's ok", () => {
        expect(
          lines.filter((one) => !one.line.includes("with your human's ok")),
        ).toEqual([]);
      });
    });
  });
});
