import { genTempDir, getError, given, then, when } from 'test-fns';

import { RoleManifest } from '@src/domain.objects/RoleManifest';
import { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';
import type { HasPackageRoot } from '@src/domain.operations/config/ContextConfigOfUsage';

import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { genGetPublishedActorOfPackages } from './genGetPublishedActorOfPackages';

/**
 * .what = an installed role package: a temp root whose rhachet.repo.yml publishes `actors:`
 */
const genInstalledPackage = (input: {
  slug: string;
  actorsYml: string[];
}): HasPackageRoot<RoleRegistryManifest> => {
  const packageRoot = genTempDir({
    slug: `published-of-packages-${input.slug}`,
  });
  writeFileSync(
    join(packageRoot, 'rhachet.repo.yml'),
    [
      `slug: ${input.slug}`,
      'readme: readme.md',
      'roles:',
      '  - slug: mechanic',
      '    readme: src/mechanic/readme.md',
      '    briefs: { dirs: src/mechanic/briefs }',
      '    skills: { dirs: src/mechanic/skills }',
      ...input.actorsYml,
      '',
    ].join('\n'),
  );
  const manifest = new RoleRegistryManifest({
    slug: input.slug,
    readme: { uri: join(packageRoot, 'readme.md') },
    roles: [
      new RoleManifest({
        slug: 'mechanic',
        readme: { uri: join(packageRoot, 'src/mechanic/readme.md') },
        briefs: { dirs: { uri: join(packageRoot, 'src/mechanic/briefs') } },
        skills: { dirs: { uri: join(packageRoot, 'src/mechanic/skills') } },
      }),
    ],
  });
  return { ...manifest, packageRoot };
};

describe('genGetPublishedActorOfPackages', () => {
  given('[case1] an installed package that publishes a named actor', () => {
    const installed = genInstalledPackage({
      slug: 'ehmpathy',
      actorsYml: [
        'actors:',
        '  - slug: builder',
        '    brain: anthropic/claude/code',
        '    roles: [ehmpathy/mechanic, bhuild/behaver]',
      ],
    });
    const getPublishedActor = genGetPublishedActorOfPackages({
      manifests: [installed],
      failures: [],
    });

    when('[t0] its actor is looked up by repo and slug', () => {
      then('it resolves to the published actor and its roles', () => {
        const actor = getPublishedActor({ repo: 'ehmpathy', slug: 'builder' });
        expect(actor?.slug).toEqual('builder');
        expect(actor?.brain).toEqual('anthropic/claude/code');
        expect(actor?.roles).toEqual(['ehmpathy/mechanic', 'bhuild/behaver']);
      });
    });

    when('[t1] a slug the package does not publish is looked up', () => {
      then('it resolves to null', () => {
        expect(
          getPublishedActor({ repo: 'ehmpathy', slug: 'nobody' }),
        ).toBeNull();
      });
    });

    when('[t2] a repo that is not installed is looked up', () => {
      then('it resolves to null', () => {
        expect(
          getPublishedActor({ repo: 'ahbode', slug: 'builder' }),
        ).toBeNull();
      });
    });

    when('[t3] the package yml is removed after the first lookup', () => {
      then('the actors read once are still served', () => {
        getPublishedActor({ repo: 'ehmpathy', slug: 'builder' });
        rmSync(join(installed.packageRoot, 'rhachet.repo.yml'), {
          force: true,
        });
        expect(
          getPublishedActor({ repo: 'ehmpathy', slug: 'builder' })?.slug,
        ).toEqual('builder');
      });
    });
  });

  given(
    '[case2] a role package that is installed but could not be read',
    () => {
      const getPublishedActor = genGetPublishedActorOfPackages({
        manifests: [],
        failures: [
          {
            packageName: 'rhachet-roles-ehmpathy',
            error: new Error('rhachet.repo.yml: bad indentation at line 4'),
          },
        ],
      });

      when('[t0] an actor of that package is looked up', () => {
        then('it fails with the package fault, never as absent', async () => {
          const error = await getError(() =>
            getPublishedActor({ repo: 'ehmpathy', slug: 'builder' }),
          );
          expect(error.message).toContain(
            'the role package that publishes @ehmpathy/builder could not be read: rhachet-roles-ehmpathy',
          );
          expect(error.message).toContain('repair or reinstall');
          expect(error.message).not.toContain('install the role package');
        });
      });

      when('[t1] a repo with no failure and no install is looked up', () => {
        then('it is absent, as before', () => {
          expect(
            getPublishedActor({ repo: 'ahbode', slug: 'builder' }),
          ).toBeNull();
        });
      });
    },
  );
});
