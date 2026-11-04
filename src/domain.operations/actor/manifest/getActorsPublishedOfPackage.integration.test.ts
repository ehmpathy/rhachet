import { genTempDir, given, then, when } from 'test-fns';

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getActorsPublishedOfPackage } from './getActorsPublishedOfPackage';

/**
 * .what = a temp package root whose `rhachet.repo.yml` holds the given content, or none
 */
const genPackageRoot = (input: { slug: string; content: string | null }) => {
  const packageRoot = genTempDir({ slug: input.slug });
  if (input.content !== null)
    writeFileSync(join(packageRoot, 'rhachet.repo.yml'), input.content);
  return packageRoot;
};

const MANIFEST_ROLES_ONLY = [
  'slug: ehmpathy',
  'readme: readme.md',
  'roles:',
  '  - slug: mechanic',
  '    readme: src/mechanic/readme.md',
  '    briefs: { dirs: src/mechanic/briefs }',
  '    skills: { dirs: src/mechanic/skills }',
  '',
].join('\n');

describe('getActorsPublishedOfPackage', () => {
  given('[case1] a package whose rhachet.repo.yml predates `actors:`', () => {
    const packageRoot = genPackageRoot({
      slug: 'published-none',
      content: MANIFEST_ROLES_ONLY,
    });

    when('[t0] its published actors are read', () => {
      then('it publishes none', () => {
        expect(getActorsPublishedOfPackage({ packageRoot })).toEqual([]);
      });
    });
  });

  given('[case2] a package whose rhachet.repo.yml carries `actors:`', () => {
    const packageRoot = genPackageRoot({
      slug: 'published-some',
      content: [
        MANIFEST_ROLES_ONLY,
        'actors:',
        '  - slug: builder',
        '    brain: anthropic/claude/code',
        '    roles: [ehmpathy/mechanic, bhuild/behaver]',
        '',
      ].join('\n'),
    });

    when('[t0] its published actors are read', () => {
      then('it publishes them', () => {
        const actors = getActorsPublishedOfPackage({ packageRoot });
        expect(actors.map((one) => one.slug)).toEqual(['builder']);
        expect(actors[0]?.roles).toEqual([
          'ehmpathy/mechanic',
          'bhuild/behaver',
        ]);
      });
    });
  });

  given('[case3] a package with no rhachet.repo.yml', () => {
    const packageRoot = genPackageRoot({
      slug: 'published-absent',
      content: null,
    });

    when('[t0] its published actors are read', () => {
      then('it publishes none', () => {
        expect(getActorsPublishedOfPackage({ packageRoot })).toEqual([]);
      });
    });
  });
});
