import { getError, given, then, when } from 'test-fns';

import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { withTempDirRemovedAfter } from './withTempDirRemovedAfter';

describe('withTempDirRemovedAfter', () => {
  given('[case1] a logic that writes a file into the dir', () => {
    when('[t0] the logic lands', () => {
      then('it returns the result, and the dir is gone after', async () => {
        const seen = await withTempDirRemovedAfter(
          { prefix: 'rhachet-test-tempdir-' },
          async ({ dir }) => {
            writeFileSync(join(dir, 'secret.json'), '{}');
            return { dir, isPresentWithin: existsSync(dir) };
          },
        );
        expect(seen.isPresentWithin).toEqual(true);
        expect(existsSync(seen.dir)).toEqual(false);
      });
    });

    when('[t1] the logic throws', () => {
      then('it rethrows, and the dir is gone after', async () => {
        const dirs: string[] = [];
        const error = await getError(
          withTempDirRemovedAfter(
            { prefix: 'rhachet-test-tempdir-' },
            async ({ dir }) => {
              dirs.push(dir); // deliberate mutation: record the dir the logic saw
              writeFileSync(join(dir, 'secret.json'), '{}');
              throw new Error('login aborted');
            },
          ),
        );
        expect(error.message).toEqual('login aborted');
        expect(existsSync(dirs[0]!)).toEqual(false);
      });
    });
  });
});
