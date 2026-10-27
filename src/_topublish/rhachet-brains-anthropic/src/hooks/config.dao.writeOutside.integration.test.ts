import * as fs from 'fs/promises';
import { ConstraintError, MalfunctionError } from 'helpful-errors';
import * as path from 'path';
import { genTempDir, getError, given, then, when } from 'test-fns';

import { realpathSync } from 'node:fs';
import { writeClaudeCodeSettings } from './config.dao';

/**
 * .what = the refusal a consumer reads — its header and its metadata — with each temp dir masked
 * .note = each dir is masked by its given name and its realpath, since a refusal may name either
 */
const asRefusalMasked = (input: {
  error: Error;
  masks: { dir: string; token: string }[];
}): string => {
  // only a ConstraintError carries the refusal a consumer reads
  if (!(input.error instanceof ConstraintError))
    throw new MalfunctionError('expected a ConstraintError refusal', {
      cause: input.error,
    });
  const error = input.error;
  return input.masks.reduce(
    (text, mask) =>
      text
        .split(realpathSync(mask.dir))
        .join(mask.token)
        .split(mask.dir)
        .join(mask.token),
    JSON.stringify(
      {
        header: error.message.split('\n')[0],
        metadata: error.metadata,
      },
      null,
      2,
    ),
  );
};

describe('writeClaudeCodeSettings never writes outside the dir it was aimed at', () => {
  given('[case1] a `.claude` that links to a dir outside `to`', () => {
    when('[t0] the write is called', () => {
      then('it refuses, and the outside dir is untouched', async () => {
        const to = genTempDir({ slug: 'dao-write-to' });
        const outside = genTempDir({ slug: 'dao-write-outside' });
        await fs.symlink(outside, path.join(to, '.claude'));
        const error = await getError(
          writeClaudeCodeSettings({ settings: { hooks: {} }, to }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain(
          'settings dir lands outside the tree it was aimed at',
        );
        expect(await fs.readdir(outside)).toEqual([]);
        expect(
          asRefusalMasked({
            error,
            masks: [
              { dir: outside, token: '$OUTSIDE' },
              { dir: to, token: '$TO' },
            ],
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case2] a `.claude` that is a broken link', () => {
    when('[t0] the write is called', () => {
      then('it refuses, with the link target named', async () => {
        const to = genTempDir({ slug: 'dao-write-broken' });
        const target = path.join(
          genTempDir({ slug: 'dao-write-gone' }),
          'gone',
        );
        await fs.symlink(target, path.join(to, '.claude'));
        const error = await getError(
          writeClaudeCodeSettings({ settings: { hooks: {} }, to }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(JSON.stringify(error)).toContain(`a broken link to ${target}`);
        expect(
          asRefusalMasked({
            error,
            masks: [
              { dir: path.dirname(target), token: '$GONE' },
              { dir: to, token: '$TO' },
            ],
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case3] a `.claude` that links to a dir inside `to`', () => {
    when('[t0] the write is called', () => {
      then(
        'it writes settings.of.repo.json through the inner link',
        async () => {
          const to = genTempDir({ slug: 'dao-write-inside' });
          const inner = path.join(to, '.agent', 'brain', '.claude');
          await fs.mkdir(inner, { recursive: true });
          await fs.symlink(inner, path.join(to, '.claude'));
          await writeClaudeCodeSettings({ settings: { hooks: {} }, to });
          expect(await fs.readdir(inner)).toEqual(['settings.of.repo.json']);
        },
      );
    });
  });

  given('[case4] a `.claude` that is a real file inside `to`', () => {
    when('[t0] the write is called', () => {
      then('it refuses with a fix, and the file is untouched', async () => {
        const to = genTempDir({ slug: 'dao-write-file' });
        await fs.writeFile(path.join(to, '.claude'), 'not a dir');
        const error = await getError(
          writeClaudeCodeSettings({ settings: { hooks: {} }, to }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('settings dir is not a directory');
        expect(error.message).toContain('move that .claude file aside');
        expect(await fs.readFile(path.join(to, '.claude'), 'utf8')).toEqual(
          'not a dir',
        );
        expect(
          asRefusalMasked({ error, masks: [{ dir: to, token: '$TO' }] }),
        ).toMatchSnapshot();
      });
    });
  });
});
