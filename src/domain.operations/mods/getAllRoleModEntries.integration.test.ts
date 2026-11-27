import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, when } from 'test-fns';

import { chmodSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
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

  given('[case3] a file where the mods dir belongs (C13, ENOTDIR)', () => {
    const cwd = realpathSync(genTempDir({ slug: 'mod-entries-enotdir' }));
    mkdirSync(join(cwd, '.agent'), { recursive: true });
    writeFileSync(join(cwd, '.agent', 'repo=.mods'), 'not a dir\n');

    when('[t0] the entries are read', () => {
      then(
        'the fault is returned, never thrown, with the move that cures it',
        () => {
          const { slugs, strays, fault } = getAllRoleModEntries({ cwd });
          expect(slugs).toEqual([]);
          expect(strays).toEqual([]);
          expect(fault).toBeInstanceOf(ConstraintError);
          expect(fault?.message).toContain('the mods path cannot be read');
          expect(JSON.stringify(fault)).toContain('ENOTDIR');
          expect(JSON.stringify(fault)).toContain('move the file aside');
        },
      );
    });
  });

  given('[case4] a mods dir with no read access (C13, EACCES)', () => {
    const cwd = realpathSync(genTempDir({ slug: 'mod-entries-eacces' }));
    const modsDir = join(cwd, '.agent', 'repo=.mods');
    mkdirSync(join(modsDir, 'role=surfer'), { recursive: true });
    beforeAll(() => chmodSync(modsDir, 0o000));
    afterAll(() => chmodSync(modsDir, 0o755));

    when('[t0] the entries are read', () => {
      then(
        'the fault is returned, never thrown, with the grant that cures it',
        () => {
          // a root process reads through any mode, so this case cannot observe EACCES as root
          if (process.getuid?.() === 0)
            throw new ConstraintError('this case needs a non-root user', {
              hint: 'run the suite as a non-root user, as ci does',
            });
          const { slugs, fault } = getAllRoleModEntries({ cwd });
          expect(slugs).toEqual([]);
          expect(fault).toBeInstanceOf(ConstraintError);
          expect(JSON.stringify(fault)).toContain('EACCES');
          expect(JSON.stringify(fault)).toContain(
            'chmod u+rx .agent/repo=.mods',
          );
        },
      );
    });
  });
});
