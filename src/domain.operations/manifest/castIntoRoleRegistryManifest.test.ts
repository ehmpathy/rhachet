import { given, then, when } from 'test-fns';

import { Role, RoleRegistry } from '@src/domain.objects';

import {
  castIntoRoleRegistryManifest,
  serializeRoleRegistryManifest,
} from './castIntoRoleRegistryManifest';

describe('castIntoRoleRegistryManifest', () => {
  given('[case1] registry with single role and single dirs', () => {
    const packageRoot = '/packages/rhachet-roles-ehmpathy';
    const registry = new RoleRegistry({
      slug: 'ehmpathy',
      readme: { uri: '/packages/rhachet-roles-ehmpathy/readme.md' },
      roles: [
        new Role({
          slug: 'mechanic',
          name: 'Mechanic',
          purpose: 'fix things',
          readme: {
            uri: '/packages/rhachet-roles-ehmpathy/src/roles/mechanic/readme.md',
          },
          traits: [],
          briefs: {
            dirs: {
              uri: '/packages/rhachet-roles-ehmpathy/src/roles/mechanic/briefs',
            },
          },
          skills: {
            dirs: {
              uri: '/packages/rhachet-roles-ehmpathy/src/roles/mechanic/skills',
            },
            refs: [],
          },
        }),
      ],
    });

    when('[t0] castIntoRoleRegistryManifest is called', () => {
      then('manifest slug matches registry slug', () => {
        const manifest = castIntoRoleRegistryManifest({
          registry,
          packageRoot,
        });
        expect(manifest.slug).toEqual('ehmpathy');
      });

      then('manifest readme is relative path', () => {
        const manifest = castIntoRoleRegistryManifest({
          registry,
          packageRoot,
        });
        expect(manifest.readme).toEqual('readme.md');
      });

      then('manifest has one role', () => {
        const manifest = castIntoRoleRegistryManifest({
          registry,
          packageRoot,
        });
        expect(manifest.roles).toHaveLength(1);
      });

      then('role slug matches', () => {
        const manifest = castIntoRoleRegistryManifest({
          registry,
          packageRoot,
        });
        expect(manifest.roles[0]?.slug).toEqual('mechanic');
      });

      then('role readme is relative path', () => {
        const manifest = castIntoRoleRegistryManifest({
          registry,
          packageRoot,
        });
        expect(manifest.roles[0]?.readme).toEqual(
          'src/roles/mechanic/readme.md',
        );
      });

      then('role briefs.dirs is single string (not array)', () => {
        const manifest = castIntoRoleRegistryManifest({
          registry,
          packageRoot,
        });
        expect(manifest.roles[0]?.briefs.dirs).toEqual(
          'src/roles/mechanic/briefs',
        );
      });

      then('role skills.dirs is single string (not array)', () => {
        const manifest = castIntoRoleRegistryManifest({
          registry,
          packageRoot,
        });
        expect(manifest.roles[0]?.skills.dirs).toEqual(
          'src/roles/mechanic/skills',
        );
      });

      then('role inits is undefined', () => {
        const manifest = castIntoRoleRegistryManifest({
          registry,
          packageRoot,
        });
        expect(manifest.roles[0]?.inits).toBeUndefined();
      });
    });
  });

  given('[case2] registry with role that has multiple dirs', () => {
    const packageRoot = '/packages/rhachet-roles-bhuild';
    const registry = new RoleRegistry({
      slug: 'bhuild',
      readme: { uri: '/packages/rhachet-roles-bhuild/readme.md' },
      roles: [
        new Role({
          slug: 'behaver',
          name: 'Behaver',
          purpose: 'behave well',
          readme: {
            uri: '/packages/rhachet-roles-bhuild/src/roles/behaver/readme.md',
          },
          traits: [],
          briefs: {
            dirs: [
              {
                uri: '/packages/rhachet-roles-bhuild/src/roles/behaver/briefs',
              },
              { uri: '/packages/rhachet-roles-bhuild/src/common/briefs' },
            ],
          },
          skills: {
            dirs: [
              {
                uri: '/packages/rhachet-roles-bhuild/src/roles/behaver/skills',
              },
              { uri: '/packages/rhachet-roles-bhuild/src/common/skills' },
            ],
            refs: [],
          },
        }),
      ],
    });

    when('[t0] castIntoRoleRegistryManifest is called', () => {
      then('role briefs.dirs is array', () => {
        const manifest = castIntoRoleRegistryManifest({
          registry,
          packageRoot,
        });
        expect(manifest.roles[0]?.briefs.dirs).toEqual([
          'src/roles/behaver/briefs',
          'src/common/briefs',
        ]);
      });

      then('role skills.dirs is array', () => {
        const manifest = castIntoRoleRegistryManifest({
          registry,
          packageRoot,
        });
        expect(manifest.roles[0]?.skills.dirs).toEqual([
          'src/roles/behaver/skills',
          'src/common/skills',
        ]);
      });
    });
  });

  given('[case3] registry with role that has inits', () => {
    const packageRoot = '/packages/rhachet-roles-test';
    const registry = new RoleRegistry({
      slug: 'test',
      readme: { uri: '/packages/rhachet-roles-test/readme.md' },
      roles: [
        new Role({
          slug: 'setup',
          name: 'Setup',
          purpose: 'setup things',
          readme: {
            uri: '/packages/rhachet-roles-test/src/roles/setup/readme.md',
          },
          traits: [],
          briefs: {
            dirs: {
              uri: '/packages/rhachet-roles-test/src/roles/setup/briefs',
            },
          },
          skills: {
            dirs: {
              uri: '/packages/rhachet-roles-test/src/roles/setup/skills',
            },
            refs: [],
          },
          inits: {
            dirs: { uri: '/packages/rhachet-roles-test/src/roles/setup/inits' },
            exec: [
              {
                cmd: '/packages/rhachet-roles-test/src/roles/setup/inits/setup.sh',
              },
            ],
          },
        }),
      ],
    });

    when('[t0] castIntoRoleRegistryManifest is called', () => {
      then('role inits.dirs is relative path', () => {
        const manifest = castIntoRoleRegistryManifest({
          registry,
          packageRoot,
        });
        expect(manifest.roles[0]?.inits?.dirs).toEqual('src/roles/setup/inits');
      });

      then('role inits.exec is array of relative paths', () => {
        const manifest = castIntoRoleRegistryManifest({
          registry,
          packageRoot,
        });
        expect(manifest.roles[0]?.inits?.exec).toEqual([
          'src/roles/setup/inits/setup.sh',
        ]);
      });
    });
  });

  given('[case4] registry with multiple roles', () => {
    const packageRoot = '/packages/rhachet-roles-multi';
    const registry = new RoleRegistry({
      slug: 'multi',
      readme: { uri: '/packages/rhachet-roles-multi/readme.md' },
      roles: [
        new Role({
          slug: 'alpha',
          name: 'Alpha',
          purpose: 'first',
          readme: {
            uri: '/packages/rhachet-roles-multi/src/roles/alpha/readme.md',
          },
          traits: [],
          briefs: {
            dirs: {
              uri: '/packages/rhachet-roles-multi/src/roles/alpha/briefs',
            },
          },
          skills: {
            dirs: {
              uri: '/packages/rhachet-roles-multi/src/roles/alpha/skills',
            },
            refs: [],
          },
        }),
        new Role({
          slug: 'beta',
          name: 'Beta',
          purpose: 'second',
          readme: {
            uri: '/packages/rhachet-roles-multi/src/roles/beta/readme.md',
          },
          traits: [],
          briefs: {
            dirs: {
              uri: '/packages/rhachet-roles-multi/src/roles/beta/briefs',
            },
          },
          skills: {
            dirs: {
              uri: '/packages/rhachet-roles-multi/src/roles/beta/skills',
            },
            refs: [],
          },
        }),
      ],
    });

    when('[t0] castIntoRoleRegistryManifest is called', () => {
      then('manifest has two roles', () => {
        const manifest = castIntoRoleRegistryManifest({
          registry,
          packageRoot,
        });
        expect(manifest.roles).toHaveLength(2);
      });

      then('roles are in order', () => {
        const manifest = castIntoRoleRegistryManifest({
          registry,
          packageRoot,
        });
        expect(manifest.roles.map((r) => r.slug)).toEqual(['alpha', 'beta']);
      });
    });
  });
});

describe('serializeRoleRegistryManifest', () => {
  given('[case1] a manifest', () => {
    const manifest = {
      slug: 'ehmpathy',
      readme: 'readme.md',
      roles: [
        {
          slug: 'mechanic',
          readme: 'src/roles/mechanic/readme.md',
          briefs: { dirs: 'src/roles/mechanic/briefs' },
          skills: { dirs: 'src/roles/mechanic/skills' },
        },
      ],
    };

    when('[t0] serializeRoleRegistryManifest is called', () => {
      then('output is yaml string', () => {
        const yaml = serializeRoleRegistryManifest({ manifest });
        expect(yaml).toContain('slug: ehmpathy');
        expect(yaml).toContain('readme: readme.md');
        expect(yaml).toContain('slug: mechanic');
      });

      then('output can be parsed back', () => {
        const yaml = serializeRoleRegistryManifest({ manifest });
        const { parse } = require('yaml');
        const parsed = parse(yaml);
        expect(parsed.slug).toEqual('ehmpathy');
        expect(parsed.roles[0].slug).toEqual('mechanic');
      });
    });
  });
});
