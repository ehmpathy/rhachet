import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneActorExpandedOfRepo } from './getOneActorExpandedOfRepo';

/**
 * .what = a repo whose `rhachet-roles-ehmpathy` dependency publishes `@ehmpathy/builder`,
 *         and whose `.agent/actors.yml` adopts it as the base of `@crew`
 */
const genRepoWithPublishedBase = (input: {
  slug: string;
  builderRoles: string[];
}): string => {
  const repoPath = genTempDir({ slug: `actor-expanded-of-repo-${input.slug}` });

  // the repo depends on the role package
  writeFileSync(
    join(repoPath, 'package.json'),
    JSON.stringify({
      name: 'demo',
      dependencies: { 'rhachet-roles-ehmpathy': '0.0.0' },
    }),
  );

  // the installed role package publishes a named actor
  const packageRoot = join(repoPath, 'node_modules', 'rhachet-roles-ehmpathy');
  ['mechanic', 'architect'].map((role) => {
    mkdirSync(join(packageRoot, 'src', role, 'briefs'), { recursive: true });
    mkdirSync(join(packageRoot, 'src', role, 'skills'), { recursive: true });
    writeFileSync(join(packageRoot, 'src', role, 'readme.md'), `# ${role}\n`);
  });
  writeFileSync(join(packageRoot, 'readme.md'), '# ehmpathy\n');
  writeFileSync(
    join(packageRoot, 'package.json'),
    JSON.stringify({ name: 'rhachet-roles-ehmpathy', version: '0.0.0' }),
  );
  writeFileSync(
    join(packageRoot, 'rhachet.repo.yml'),
    [
      'slug: ehmpathy',
      'readme: readme.md',
      'roles:',
      ...['mechanic', 'architect'].flatMap((role) => [
        `  - slug: ${role}`,
        `    readme: src/${role}/readme.md`,
        `    briefs: { dirs: src/${role}/briefs }`,
        `    skills: { dirs: src/${role}/skills }`,
      ]),
      'actors:',
      '  - slug: builder',
      '    brain: claude',
      `    roles: [${input.builderRoles.join(', ')}]`,
      '',
    ].join('\n'),
  );

  // the repo adopts the published actor by name, and extends it
  mkdirSync(join(repoPath, '.agent'), { recursive: true });
  writeFileSync(
    join(repoPath, '.agent', 'actors.yml'),
    [
      "ambient: '@crew'",
      'actor:',
      '  - slug: crew',
      '    brain: claude',
      "    roles: ['@ehmpathy/builder', '+bhrowser/playwright']",
      '',
    ].join('\n'),
  );
  return repoPath;
};

describe('getOneActorExpandedOfRepo', () => {
  given('[case1] the ambient actor extends a published base by name', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genRepoWithPublishedBase({
        slug: 'case1',
        builderRoles: ['ehmpathy/mechanic'],
      });
      const expanded = await getOneActorExpandedOfRepo(
        { actor: { ambient: true } },
        new ContextCli({ cwd: repoPath, gitroot: repoPath }),
      );
      return { expanded };
    });

    when('[t0] the repo actor is expanded', () => {
      then('the published base roles expand, plus the extension', () => {
        expect(scene.expanded?.slug).toEqual('crew');
        expect(scene.expanded?.roles).toEqual([
          'ehmpathy/mechanic',
          'bhrowser/playwright',
        ]);
      });
    });
  });

  given('[case2] the published base gains a role', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genRepoWithPublishedBase({
        slug: 'case2',
        builderRoles: ['ehmpathy/mechanic', 'ehmpathy/architect'],
      });
      const expanded = await getOneActorExpandedOfRepo(
        { actor: { slug: 'crew' } },
        new ContextCli({ cwd: repoPath, gitroot: repoPath }),
      );
      return { expanded };
    });

    when('[t0] the extension is expanded', () => {
      then('it gains the role too, with no edit to the repo', () => {
        expect(scene.expanded?.roles).toEqual([
          'ehmpathy/mechanic',
          'ehmpathy/architect',
          'bhrowser/playwright',
        ]);
      });
    });
  });
});
