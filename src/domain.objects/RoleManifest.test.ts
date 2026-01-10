import { given, then, when } from 'test-fns';

import { Role } from './Role';
import { RoleManifest } from './RoleManifest';

describe('RoleManifest', () => {
  given('[case1] RoleManifest class', () => {
    when('[t0] unique key is checked', () => {
      then('slug is the unique key', () => {
        expect(RoleManifest.unique).toEqual(['slug']);
      });
    });
  });

  given('[case2] Role satisfies RoleManifest', () => {
    when('[t0] Role instance is created', () => {
      const role = new Role({
        slug: 'mechanic',
        name: 'Mechanic',
        purpose: 'fixes things',
        readme: { uri: '/path/to/readme.md' },
        traits: [],
        briefs: { dirs: { uri: '/path/to/briefs' } },
        skills: {
          dirs: { uri: '/path/to/skills' },
          refs: [],
        },
        inits: {
          dirs: { uri: '/path/to/inits' },
          exec: [{ cmd: '/path/to/init.sh' }],
        },
      });

      then('Role can be assigned to RoleManifest type', () => {
        // this proves Role satisfies RoleManifest at compile time
        const manifest: RoleManifest = role;
        expect(manifest.slug).toEqual('mechanic');
      });

      then('Role has all required RoleManifest properties', () => {
        const manifest: RoleManifest = role;
        expect(manifest.slug).toEqual('mechanic');
        expect(manifest.readme).toEqual({ uri: '/path/to/readme.md' });
        expect(manifest.briefs).toEqual({ dirs: { uri: '/path/to/briefs' } });
        expect(manifest.skills.dirs).toEqual({ uri: '/path/to/skills' });
        expect(manifest.inits?.dirs).toEqual({ uri: '/path/to/inits' });
        expect(manifest.inits?.exec).toEqual([{ cmd: '/path/to/init.sh' }]);
      });
    });

    when('[t1] Role has array dirs', () => {
      const role = new Role({
        slug: 'reviewer',
        name: 'Reviewer',
        purpose: 'reviews things',
        readme: { uri: '/path/to/readme.md' },
        traits: [],
        briefs: {
          dirs: [{ uri: '/path/to/briefs1' }, { uri: '/path/to/briefs2' }],
        },
        skills: {
          dirs: [{ uri: '/path/to/skills1' }],
          refs: [],
        },
      });

      then('Role with array dirs satisfies RoleManifest', () => {
        const manifest: RoleManifest = role;
        expect(manifest.briefs.dirs).toEqual([
          { uri: '/path/to/briefs1' },
          { uri: '/path/to/briefs2' },
        ]);
      });
    });

    when('[t2] Role without inits', () => {
      const role = new Role({
        slug: 'basic',
        name: 'Basic',
        purpose: 'basic role',
        readme: { uri: '/path/to/readme.md' },
        traits: [],
        briefs: { dirs: { uri: '/path/to/briefs' } },
        skills: {
          dirs: { uri: '/path/to/skills' },
          refs: [],
        },
      });

      then('Role without inits satisfies RoleManifest', () => {
        const manifest: RoleManifest = role;
        expect(manifest.inits).toBeUndefined();
      });
    });
  });

  given('[case3] RoleManifest instance', () => {
    when('[t0] created with valid data', () => {
      const manifest = new RoleManifest({
        slug: 'manifest-role',
        readme: { uri: '/path/to/readme.md' },
        briefs: { dirs: { uri: '/path/to/briefs' } },
        skills: { dirs: { uri: '/path/to/skills' } },
      });

      then('slug is accessible', () => {
        expect(manifest.slug).toEqual('manifest-role');
      });

      then('readme is accessible', () => {
        expect(manifest.readme).toEqual({ uri: '/path/to/readme.md' });
      });
    });
  });
});
