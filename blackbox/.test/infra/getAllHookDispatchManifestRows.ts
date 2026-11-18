import * as fs from 'fs/promises';
import { MalfunctionError } from 'helpful-errors';
import * as path from 'path';

/**
 * .what = the role hook rules one brain dir's dispatch manifest holds, as
 *   `{ event, matcher, author, command }`
 * .why = role hooks no longer sit one per entry in `settings.of.repo.json`; each lives as a row of
 *   `hooks.dispatch.manifest` beside it, run by the one dispatcher hook per event. a blackbox
 *   assert reads the rows from the file itself, the same bytes the dispatcher reads
 * .note = the first line is a header; fields split by `\x1f` in the order
 *   event · matcher · timeout · author · kind · path · frame · args · command · when
 * .note = an absent manifest reads as no rows
 */
export const getAllHookDispatchManifestRows = async (input: {
  claudeDir: string;
}): Promise<
  Array<{ event: string; matcher: string; author: string; command: string }>
> => {
  const text = await fs
    .readFile(path.join(input.claudeDir, 'hooks.dispatch.manifest'), 'utf-8')
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return '';
      throw error;
    });
  return text
    .split('\n')
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => {
      // a row short of its ten fields fails loud, so an assert never passes on an absent author
      const fields = line.split('\x1f');
      if (fields.length !== 10)
        throw new MalfunctionError('hooks.dispatch.manifest row lacks its ten fields', {
          fieldCount: fields.length,
          line,
        });
      return {
        event: fields[0]!,
        matcher: fields[1]!,
        author: fields[3]!,
        command: fields[8]!,
      };
    });
};

/**
 * .what = the author every dispatcher hook carries in a settings file
 * .why = an assert tells the one dispatcher hook per event apart from a hand-added hook
 */
export const HOOK_DISPATCH_AUTHOR = 'rhachet/hooks.dispatch';
