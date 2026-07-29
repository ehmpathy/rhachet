import path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { TEST_FIXTURE_DIRECTORY } from '@src/.test/directory';
import { invokeRhachetCli } from '@src/.test/infra';

// .what = the rhachet repo root
// .why = the config's role/registry readme uris are repo-relative
//   (e.g. 'src/.test/example.use.repo/readme.role.md'), so the child must
//   run with cwd at the repo root for those uris to be found
const REPO_ROOT = path.resolve(__dirname, '../../..');

describe('invoke (integration)', () => {
  given('a valid config path pointing to a basic test registry', () => {
    const configPath = path.resolve(
      TEST_FIXTURE_DIRECTORY,
      './example.use.repo/example.rhachet.use.ts',
    );

    // .note = this suite spawns the CLI in a real node child (npx tsx) rather than
    //   calling invoke() in-process. the #429 fix routes config-explicit registry loads
    //   through a genuine runtime import() (importEsmSafe) so an esm-only rhachet.use.ts
    //   loads without a module-system change. jest's vm sandbox REFUSES a dynamic import
    //   without --experimental-vm-modules (proven empirically —
    //   TypeError [ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG]), so an in-process invoke()
    //   can no longer load a config under jest. a real node child has no vm restriction and
    //   is the honest witness for the CLI contract (see ehmpathy/rhachet#429).

    when('asked to readme a role', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCli({
          args: [
            '--config',
            configPath,
            'readme',
            '--repo',
            'echo',
            '--role',
            'echoer',
          ],
          cwd: REPO_ROOT,
        }),
      );

      then('it exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('it should print the expected readme from the role', () => {
        expect(result.stdout).toContain(
          'Knows how to echo input back to the user.',
        );
      });
    });

    when('asked to "roles init" with a valid role', () => {
      // this test ensures that "roles init" is correctly routed through
      // the full command structure, not caught by the bare "init" check
      const result = useBeforeAll(async () =>
        invokeRhachetCli({
          args: ['--config', configPath, 'roles', 'init', '--role', 'echoer'],
          cwd: REPO_ROOT,
        }),
      );

      then('it exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then(
        'it should route to "roles init" subcommand (not bare "init")',
        () => {
          // roles init should show the init message (echoer has no init commands)
          // the key assertion is that it doesn't error with "unknown command 'roles'"
          expect(result.stdout).toContain('Role "echoer"');
          expect(result.stdout).toContain('has no initialization commands');
        },
      );
    });
  });
});
