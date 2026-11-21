import { genTempDir, given, then, when } from 'test-fns';

import { withHostMutex } from '@src/infra/lock/withHostMutex';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

describe('withHostMutex', () => {
  given(
    '[case1] a file under the home dir, shared by every repo on the box',
    () => {
      const home = genTempDir({ slug: 'withHostMutex' });
      const path = join(home, '.rhachet', 'keyrack', 'keyrack.host.age');

      beforeAll(() => {
        mkdirSync(join(home, '.rhachet', 'keyrack'), { recursive: true });
        writeFileSync(path, '0');
      });

      when(
        '[t0] twenty bumps run at once, each a read, a yield, and a write',
        () => {
          then('every bump survives — the sections took turns', async () => {
            // .note = the yield between read and write is what loses an update without the mutex
            await Promise.all(
              Array.from({ length: 20 }, () =>
                withHostMutex({ home, path }, async () => {
                  const count = Number(readFileSync(path, 'utf8'));
                  await delay(5);
                  writeFileSync(path, String(count + 1));
                }),
              ),
            );
            expect(readFileSync(path, 'utf8')).toEqual('20');
          });

          then('the keys live under the home dir, never in a repo', () => {
            expect(existsSync(join(home, '.rhachet', '.locks'))).toBe(true);
            expect(existsSync(join(home, '.agent'))).toBe(false);
          });
        },
      );
    },
  );
});
