import { getError, given, then, useThen, when } from 'test-fns';

import { asSnapshotSafe as asMaskedPaths } from '@src/.test/infra/asSnapshotSafe';

import { mkdirSync, rmSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import type { BootSource } from './BootSource';
import { getOneBootSourceFromRegistryRole } from './getOneBootSourceFromRegistryRole';
import { getOneBootSourceFromRole } from './getOneBootSourceFromRole';

/**
 * .what = masks the temp dir — this arm never reads the git root, so one mask suffices
 */
const asSnapshotSafe = (input: { of: string; testDir: string }): string =>
  asMaskedPaths({
    of: input.of,
    masks: [{ path: input.testDir, into: '/TMP_REPO' }],
  });

/**
 * .what = clamps the role-default arm's own guarantees, at the grain that can observe them
 * .why = this arm reads `existsSync`, so it is an integration test by definition
 *   (`rule.forbid.unit.remote-boundaries`).
 * .note = the absent-role-dir refusal is unreachable from `roles boot`, which looks the
 *   role up via `findUniqueRoleDir` before it calls `bootRoleResources`. it is reachable
 *   from the sdk and from `roles cost --all`'s sweep, which hands this arm a spec path a
 *   glob matched rather than a coordinate a human typed.
 */
describe('getOneBootSourceFromRole (integration)', () => {
  const testDir = resolve(__dirname, './.temp/getOneBootSourceFromRole');

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  given('[case1] a role whose dir is absent, and --if-present is off', () => {
    when('[t0] the source is looked up for a LINKED repo', () => {
      then('it refuses, and the message names `roles link`', () => {
        const error = getError(() =>
          getOneBootSourceFromRole({
            slugRepo: 'bhrain',
            slugRole: 'driver',
            ifPresent: false,
            cwd: testDir,
          }),
        );

        expect(error).toBeDefined();
        expect(
          asSnapshotSafe({ of: error!.message, testDir }),
        ).toMatchSnapshot();
      });
    });

    when('[t1] the source is looked up for the repo ITSELF', () => {
      then('it refuses, and the fix names the dirs to create', () => {
        const error = getError(() =>
          getOneBootSourceFromRole({
            slugRepo: '.this',
            slugRole: 'any',
            ifPresent: false,
            cwd: testDir,
          }),
        );

        expect(error).toBeDefined();
        expect(
          asSnapshotSafe({ of: error!.message, testDir }),
        ).toMatchSnapshot();
      });
    });

    when('[t2] --if-present is ON', () => {
      // `--if-present` means "boot whichever of these roles are here", so a null is a
      // legitimate answer for a set member
      then('it returns null rather than refuses — a set may be partial', () => {
        const source = getOneBootSourceFromRole({
          slugRepo: 'bhrain',
          slugRole: 'driver',
          ifPresent: true,
          cwd: testDir,
        });

        expect(source).toEqual(null);
      });
    });
  });

  given('[case2] a role whose dir is present', () => {
    const slugRepo = 'bhrain';
    const slugRole = 'driver';
    const inputBase = { slugRepo, slugRole, ifPresent: false };

    beforeAll(() => {
      mkdirSync(
        resolve(testDir, '.agent', `repo=${slugRepo}`, `role=${slugRole}`),
        { recursive: true },
      );
    });

    when('[t0] the source is built', () => {
      // ONE lookup, three facets — one read serves every then below
      const source = useThen(
        'it builds',
        () => getOneBootSourceFromRole({ ...inputBase, cwd: testDir })!,
      );

      // a role's brief universe is its `briefs/` subdir; a manifest's is every
      // neighbor of the spec
      then(
        'the brief universe is the `briefs/` subdir, never the whole dir',
        () => {
          expect(source.dirBriefs).toEqual(resolve(source.rootDir, 'briefs'));
        },
      );

      // an absent boot.yml at a PRESENT role dir means say-all, unconditionally — so a
      // downstream absence is a fallback rather than a vanish race
      then('the spec is NOT declared — the coordinate is computed', () => {
        expect(source.specIsDeclared).toEqual(false);
      });

      then('the coordinates are the flags that address it', () => {
        expect(source.coordinates).toEqual('--repo bhrain --role driver');
      });
    });

    /**
     * .what = pins that the two role arms AGREE on the half they share, and DIFFER on the
     *   half they are meant to
     * .why = both arms derive the consumer coordinate `.agent/repo=$slug/role=$name/` and the
     *   same four filenames off a root, while the registry arm reads the AUTHOR'S dir
     */
    when('[t1] the REGISTRY arm derives from the same slugs', () => {
      const dirRole = resolve(
        testDir,
        '.agent',
        `repo=${slugRepo}`,
        `role=${slugRole}`,
      );

      const genFromRole = (): BootSource =>
        getOneBootSourceFromRole({ ...inputBase, cwd: testDir })!;

      const genFromRegistry = (): BootSource =>
        getOneBootSourceFromRegistryRole({
          slugRepo,
          slugRole,
          dirRole,
          dirRepo: testDir,
        });

      // ONE build per arm, read by all three `then`s below
      const arms = useThen('both arms build', () => ({
        role: genFromRole(),
        registry: genFromRegistry(),
      }));

      then('🔴 both arms build the SAME consumer coordinate prefix', () => {
        // gate 1 measures a payload whose labels must match what a consumer will see
        expect(arms.registry.label.prefix).toEqual(arms.role.label.prefix);
        expect(arms.role.label.prefix).toEqual(
          `.agent/repo=${slugRepo}/role=${slugRole}/`,
        );
      });

      then('🔴 both arms derive the SAME four paths off their root', () => {
        // `dirBriefs` is nullable on the BootSource contract — the MANIFEST arm nulls it.
        // that both role arms set it is asserted here explicitly, before the comparison
        expect(arms.role.dirBriefs).not.toEqual(null);
        expect(arms.registry.dirBriefs).not.toEqual(null);

        // asserted as a SET rather than field-by-field
        const asDerived = (source: BootSource): Record<string, string> => ({
          spec: relative(source.rootDir, source.pathToSpec),
          readme: relative(source.rootDir, source.pathToReadme),
          briefs: relative(source.rootDir, source.dirBriefs!),
          skills: relative(source.rootDir, source.dirSkills),
        });

        expect(asDerived(arms.registry)).toEqual(asDerived(arms.role));
      });

      // the negative half: gate 1 reads the author's dir while it renders the
      // consumer's coordinate, so the two must differ here
      then('🟡 and they DIFFER on the three fields that must differ', () => {
        expect(arms.registry.invocation).not.toEqual(arms.role.invocation);
        expect(arms.registry.coordinates).toMatch(/^--what /);
        expect(arms.role.coordinates).not.toMatch(/^--what /);
        expect(arms.registry.coordinates).not.toEqual(arms.role.coordinates);
      });
    });
  });
});
