import { getError, given, then, when } from 'test-fns';

import { genSampleRepoWithActorsYml as genRepoWithActorsYml } from '@src/.test/assets/genSampleRepoWithActorsYml';

import { getActorsManifest } from './getActorsManifest';

describe('getActorsManifest', () => {
  given('[case1] a repo with no actors.yml', () => {
    const repoPath = genRepoWithActorsYml({
      slug: 'actors-yml-absent',
      content: null,
    });

    when('[t0] the manifest is read', () => {
      then('it returns null, so today holds (case=5)', () => {
        expect(getActorsManifest({ repoPath })).toBeNull();
      });
    });
  });

  given('[case2] a valid actors.yml with quoted `@` values', () => {
    const repoPath = genRepoWithActorsYml({
      slug: 'actors-yml-valid',
      content: [
        "ambient: '@builder'",
        'actor:',
        '  - slug: builder',
        '    roles:',
        "      - '@ehmpathy/builder'",
        '      - +bhrowser/playwright',
        '  - slug: scholar',
        '    brain: anthropic/claude/code',
        '    roles: [bhrain/librarian, ehmpathy/architect]',
        '',
      ].join('\n'),
    });

    when('[t0] the manifest is read', () => {
      then('it names the repo actor and both actors', () => {
        const manifest = getActorsManifest({ repoPath });
        expect(manifest?.ambient).toEqual('@builder');
        expect(manifest?.actor.map((one) => one.slug)).toEqual([
          'builder',
          'scholar',
        ]);
        expect(manifest?.actor[0]?.roles).toEqual([
          '@ehmpathy/builder',
          '+bhrowser/playwright',
        ]);
      });
    });
  });

  given('[case3] an actors.yml with an unquoted `@` value', () => {
    const repoPath = genRepoWithActorsYml({
      slug: 'actors-yml-bare-at',
      content: ['ambient: @builder', 'actor: []', ''].join('\n'),
    });

    when('[t0] the manifest is read', () => {
      then('it fails fast and names the quote fix', async () => {
        const error = await getError(() => getActorsManifest({ repoPath }));
        expect(error.message).toContain('actors.yml has an unquoted `@` value');
        expect(error.message).toContain("ambient: '@builder'");
      });
    });
  });

  given('[case4] an actors.yml with broken yaml', () => {
    const repoPath = genRepoWithActorsYml({
      slug: 'actors-yml-broken',
      content: ['ambient: "@builder', 'actor:', ''].join('\n'),
    });

    when('[t0] the manifest is read', () => {
      then('it fails fast as invalid yaml', async () => {
        const error = await getError(() => getActorsManifest({ repoPath }));
        expect(error.message).toContain('actors.yml has invalid yaml');
      });
    });
  });
});
