import { genTempDir, given, then, when } from 'test-fns';

import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllRoleModEntries } from './getAllRoleModEntries';

/**
 * .what = a temp repo whose `.agent/repo=.mods/` holds the given entries
 * .note = an entry that ends in `/` is a dir; any other is an empty file
 */
const genRepoWithModsEntries = (input: {
  slug: string;
  entries: string[] | null;
}): string => {
  const cwd = realpathSync(genTempDir({ slug: input.slug }));
  if (!input.entries) return cwd;
  const modsDir = join(cwd, '.agent', 'repo=.mods');
  mkdirSync(modsDir, { recursive: true });
  for (const entry of input.entries) {
    if (entry.endsWith('/'))
      mkdirSync(join(modsDir, entry), { recursive: true });
    else writeFileSync(join(modsDir, entry), '');
  }
  return cwd;
};

describe('getAllRoleModEntries', () => {
  given('[case1] a repo with no mods dir', () => {
    const cwd = genRepoWithModsEntries({
      slug: 'mod-entries-none',
      entries: null,
    });

    when('[t0] the entries are read', () => {
      then('there are no slugs and no strays', () => {
        const { slugs, strays } = getAllRoleModEntries({ cwd });
        expect(slugs).toEqual([]);
        expect(strays).toEqual([]);
      });
    });
  });

  given('[case2] a mods dir of role dirs, strays and dotfiles', () => {
    const cwd = genRepoWithModsEntries({
      slug: 'mod-entries-mixed',
      entries: [
        'role=mechanic/',
        'role=architect/',
        'readme.md',
        'mechanic/',
        '.gitkeep',
        '.DS_Store',
      ],
    });

    when('[t0] the entries are read', () => {
      const { modsDir, slugs, strays } = getAllRoleModEntries({ cwd });

      then('each role slug is named, sorted', () => {
        expect(slugs).toEqual(['architect', 'mechanic']);
      });

      then('each entry that names no role is a stray, never thrown', () => {
        expect(strays).toEqual(['mechanic', 'readme.md']);
      });

      then('a dotfile is neither a slug nor a stray', () => {
        expect([...slugs, ...strays]).not.toContain('.gitkeep');
        expect([...slugs, ...strays]).not.toContain('.DS_Store');
      });

      then('the mods dir is named, for the caller to cite', () => {
        expect(modsDir).toEqual(join(cwd, '.agent', 'repo=.mods'));
      });
    });
  });
});
