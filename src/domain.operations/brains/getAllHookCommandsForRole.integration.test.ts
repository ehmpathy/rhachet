import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllHookCommandsForRole } from './getAllHookCommandsForRole';

/**
 * .note = the load path of a real package runs through importEsmSafe, which jest cannot run
 *   (native import() needs --experimental-vm-modules — see importPackageExports.integration
 *   .test.ts). the read of a loaded registry is proven in asHookCommandsOfRegistryRole.test.ts;
 *   this suite proves the load boundary jest can witness: an absent package is an error
 */
describe('getAllHookCommandsForRole', () => {
  given('[case1] a repo with no such package installed', () => {
    const scene = useBeforeAll(async () => {
      const gitroot = genTempDir({ slug: 'hook-commands-absent' });
      writeFileSync(
        join(gitroot, 'package.json'),
        JSON.stringify({ name: 'surf-repo', version: '0.0.0' }),
      );
      return {
        result: await getAllHookCommandsForRole({
          ref: { repo: 'reef', role: 'diver' },
          gitroot,
        }),
      };
    });

    when('[t0] the commands are read', () => {
      then('an error is returned, never an empty list', () => {
        expect(scene.result.commands).toEqual(null);
        expect(scene.result.error).not.toEqual(null);
      });
    });
  });
});
