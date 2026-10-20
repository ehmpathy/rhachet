import { genTempDir, given, then, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverRolePackages } from './discoverRolePackages';

describe('discoverRolePackages', () => {
  given('[case1] a repo with no package.json', () => {
    when('[t0] the role packages are discovered', () => {
      then('it discovers none, and does not throw', async () => {
        const dir = genTempDir({ slug: 'discoverRolePackages-absent' });
        const packages = await discoverRolePackages(
          new ContextCli({ cwd: dir, gitroot: dir }),
        );
        expect(packages).toEqual([]);
      });
    });
  });

  given('[case2] a repo whose package.json declares role packages', () => {
    when('[t0] the role packages are discovered', () => {
      then(
        'it names each rhachet-roles-* dep, from both maps, and no other',
        async () => {
          const dir = genTempDir({ slug: 'discoverRolePackages-present' });
          writeFileSync(
            join(dir, 'package.json'),
            JSON.stringify({
              dependencies: { 'rhachet-roles-bhrain': '1.0.0', zod: '3.0.0' },
              devDependencies: { 'rhachet-roles-ehmpathy': '1.0.0' },
            }),
          );
          const packages = await discoverRolePackages(
            new ContextCli({ cwd: dir, gitroot: dir }),
          );
          expect(packages.sort()).toEqual([
            'rhachet-roles-bhrain',
            'rhachet-roles-ehmpathy',
          ]);
        },
      );
    });
  });
});
