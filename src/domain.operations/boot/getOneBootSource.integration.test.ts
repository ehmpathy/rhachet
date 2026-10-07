import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getOneBootSource } from './getOneBootSource';

/**
 * .what = clamps the DISPATCH — that each `from` key reaches its own arm — and the one
 *   request guard, `ifPresent` on an arm that cannot honor it
 * .why = the dispatcher's guarantees are which arm each `from` key reaches, and that no flag
 *   is quietly dropped. every arm guard and every field is clamped by the arm that owns it:
 *     - `getOneBootSourceFromRegistryRole.test.ts`        (a pure arm — unit grain)
 *     - `getOneBootSourceFromRole.integration.test.ts`
 *     - `getOneBootSourceFromManifest.integration.test.ts`
 * .note = each case asserts on the field that is DISTINCTIVE to its arm, never on a field the
 *   arms share.
 */
describe('getOneBootSource (integration)', () => {
  const testDir = resolve(__dirname, './.temp/getOneBootSource');

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(resolve(testDir, '.agent', 'repo=bhrain', 'role=driver'), {
      recursive: true,
    });
    writeFileSync(
      resolve(testDir, 'boot.yml'),
      'always:\n  briefs:\n    say: []\n',
      'utf-8',
    );
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  given('[case1] a request that names `registryRole`', () => {
    when('[t0] the source is looked up', () => {
      // distinctive: only this arm offers the `--what <spec path>` coordinate
      then('it reaches the registry arm', () => {
        const source = getOneBootSource({
          from: {
            registryRole: {
              slugRepo: 'ehmpathy',
              slugRole: 'mechanic',
              dirRole: '/pkg/roles/mechanic',
              dirRepo: '/pkg',
            },
          },
          ifPresent: false,
          cwd: testDir,
        });

        expect(source!.coordinates).toEqual('--what roles/mechanic/boot.yml');
        expect(source!.invocation).toContain('repo introspect');
      });
    });
  });

  given('[case2] a request that names `role`', () => {
    when('[t0] the source is looked up', () => {
      // distinctive: `--repo`/`--role` coordinates, and a `briefs/` universe
      then('it reaches the role arm', () => {
        const source = getOneBootSource({
          from: { role: { slugRepo: 'bhrain', slugRole: 'driver' } },
          ifPresent: false,
          cwd: testDir,
        });

        expect(source!.coordinates).toEqual('--repo bhrain --role driver');
        expect(source!.dirBriefs).not.toEqual(null);
      });
    });
  });

  given('[case3] a request that names `manifest`', () => {
    when('[t0] the source is looked up', () => {
      // distinctive: a `--what` coordinate, and a null brief universe
      then('it reaches the manifest arm', () => {
        const source = getOneBootSource({
          from: { manifest: { path: 'boot.yml' } },
          ifPresent: false,
          cwd: testDir,
        });

        expect(source!.coordinates).toEqual('--what boot.yml');
        expect(source!.dirBriefs).toEqual(null);
      });
    });
  });

  given('[case4] `ifPresent` paired with an arm that cannot honor it', () => {
    when('[t0] the request names `manifest` with ifPresent true', () => {
      then('it refuses loudly rather than drop the flag', async () => {
        const error = await getError(() =>
          getOneBootSource({
            from: { manifest: { path: 'boot.yml' } },
            ifPresent: true,
            cwd: testDir,
          }),
        );

        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('ifPresent applies only to a role');
      });
    });

    when('[t1] the request names `registryRole` with ifPresent true', () => {
      then('it refuses loudly rather than drop the flag', async () => {
        const error = await getError(() =>
          getOneBootSource({
            from: {
              registryRole: {
                slugRepo: 'ehmpathy',
                slugRole: 'mechanic',
                dirRole: '/pkg/roles/mechanic',
                dirRepo: '/pkg',
              },
            },
            ifPresent: true,
            cwd: testDir,
          }),
        );

        expect(error).toBeInstanceOf(ConstraintError);
      });
    });
  });
});
