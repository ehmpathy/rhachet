import { given, then, when } from 'test-fns';

import { RoleManifest } from './RoleManifest';
import { RoleRegistryManifest } from './RoleRegistryManifest';

describe('RoleRegistryManifest', () => {
  given('[case1] RoleRegistryManifest class', () => {
    when('[t0] unique key is checked', () => {
      then('slug is the unique key', () => {
        expect(RoleRegistryManifest.unique).toEqual(['slug']);
      });
    });
  });

  given('[case2] RoleRegistryManifest instance', () => {
    when('[t0] constructed with valid resolved data', () => {
      const manifest = new RoleRegistryManifest({
        slug: 'ehmpathy',
        readme: { uri: '/pkg/readme.md' },
        roles: [
          new RoleManifest({
            slug: 'mechanic',
            readme: { uri: '/pkg/src/roles/mechanic/readme.md' },
            briefs: { dirs: { uri: '/pkg/src/roles/mechanic/briefs' } },
            skills: { dirs: { uri: '/pkg/src/roles/mechanic/skills' } },
          }),
        ],
      });

      then('slug is accessible', () => {
        expect(manifest.slug).toEqual('ehmpathy');
      });

      then('roles are accessible', () => {
        expect(manifest.roles).toHaveLength(1);
        expect(manifest.roles[0]?.slug).toEqual('mechanic');
      });
    });
  });
});
