import { ConstraintError } from 'helpful-errors';
import { genTempDir, getError, given, then, when } from 'test-fns';

import { withFileMutex } from '@src/infra/lock/withFileMutex';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

describe('withFileMutex', () => {
  given('[case1] a file under a neutral root, no locksDir named', () => {
    const root = genTempDir({ slug: 'withFileMutex-default' });
    const path = join(root, 'data', 'count.txt');

    beforeAll(() => {
      mkdirSync(join(root, 'data'), { recursive: true });
      writeFileSync(path, '0');
    });

    when(
      '[t0] twenty bumps run at once, each a read, a yield, and a write',
      () => {
        then('every bump survives — the sections took turns', async () => {
          // .note = the yield between read and write is what loses an update without the mutex
          await Promise.all(
            Array.from({ length: 20 }, () =>
              withFileMutex({ root, path }, async () => {
                const count = Number(readFileSync(path, 'utf8'));
                await delay(5);
                writeFileSync(path, String(count + 1));
              }),
            ),
          );
          expect(readFileSync(path, 'utf8')).toEqual('20');
        });

        then('the keys live at <root>/.locks/, behind a * ignore', () => {
          expect(
            readFileSync(join(root, '.locks', '.gitignore'), 'utf8'),
          ).toEqual('*\n');
          expect(existsSync(join(root, '.agent'))).toBe(false);
          expect(existsSync(join(root, '.rhachet'))).toBe(false);
        });
      },
    );
  });

  given('[case2] a locksDir named apart from the root', () => {
    const root = genTempDir({ slug: 'withFileMutex-locksdir' });
    const locksDir = join(root, 'elsewhere', 'keys');
    const path = join(root, 'file.txt');

    when('[t0] one section runs', () => {
      then('it returns the section result', async () => {
        const result = await withFileMutex(
          { root, path, locksDir },
          async () => 7,
        );
        expect(result).toEqual(7);
      });

      then('the keys live in the named dir, never at <root>/.locks/', () => {
        expect(existsSync(join(locksDir, '.gitignore'))).toBe(true);
        expect(existsSync(join(root, '.locks'))).toBe(false);
      });
    });
  });

  given('[case3] a peer holds the key past the wait bound', () => {
    const root = genTempDir({ slug: 'withFileMutex-wait' });
    const path = join(root, 'held.txt');

    when('[t0] a second section waits 300ms', () => {
      then(
        'it fails loud as a ConstraintError that names the file',
        async () => {
          const holder = withFileMutex({ root, path }, async () => {
            await delay(1_500);
          });
          await delay(100);
          const error = await getError(
            withFileMutex({ root, path, waitMs: 300 }, async () => 'never'),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain(
            'another rhx process holds this file',
          );
          expect(error.message).toContain(path);
          await holder;
        },
      );
    });
  });
});
