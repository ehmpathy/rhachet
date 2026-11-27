import { genTempDir, given, then, when } from 'test-fns';

import {
  mkdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { getAllRoleFilesAsPublished } from './getAllRoleFilesAsPublished';

/**
 * .what = a temp repo with one published role and the view a render left of it
 * .why = the view lacks the brief the mod not-ed and links a mod brief, so a boot that reads the
 *        view as it stands would boot the mod; the published form must be read from the sources
 *
 * .note = `briefsAs` picks the view's briefs kind dir: a modded view of file links, or the dir
 *   link `roles link` makes for a role never modded
 */
const genRepoWithRoleView = (input: {
  slug: string;
  briefsAs: 'modded-view' | 'dir-link';
  record: 'sound' | 'corrupt' | 'absent' | 'dir';
}): { cwd: string; roleDir: string; dirSourceBriefs: string } => {
  const cwd = realpathSync(genTempDir({ slug: input.slug }));

  // the published role, as a package keeps it
  const dirSourceBriefs = join(cwd, 'node_modules', 'pkg', 'briefs');
  const dirSourceSkills = join(cwd, 'node_modules', 'pkg', 'skills');
  mkdirSync(dirSourceBriefs, { recursive: true });
  mkdirSync(dirSourceSkills, { recursive: true });
  writeFileSync(join(dirSourceBriefs, 'rule.require.wax.md'), 'wax\n');
  writeFileSync(join(dirSourceBriefs, 'rule.forbid.wipeout.md'), 'wipeout\n');
  writeFileSync(join(dirSourceSkills, 'paddle.sh'), '# paddle\n');

  // the mod: one added brief
  const dirModBriefs = join(
    cwd,
    '.agent',
    'repo=.mods',
    'role=surfer',
    'briefs',
  );
  mkdirSync(dirModBriefs, { recursive: true });
  writeFileSync(join(dirModBriefs, 'rule.require.reef.md'), 'reef\n');

  // the role dir: its own readme, and skills as the dir link `roles link` makes
  const roleDir = join(cwd, '.agent', 'repo=test', 'role=surfer');
  mkdirSync(roleDir, { recursive: true });
  writeFileSync(join(roleDir, 'readme.md'), 'surfer\n');
  symlinkSync(dirSourceSkills, join(roleDir, 'skills'));

  // the briefs kind dir: a view of file links that lacks the not-ed brief, or a dir link
  if (input.briefsAs === 'dir-link')
    symlinkSync(dirSourceBriefs, join(roleDir, 'briefs'));
  if (input.briefsAs === 'modded-view') {
    mkdirSync(join(roleDir, 'briefs'));
    symlinkSync(
      join(dirSourceBriefs, 'rule.require.wax.md'),
      join(roleDir, 'briefs', 'rule.require.wax.md'),
    );
    symlinkSync(
      join(dirModBriefs, 'rule.require.reef.md'),
      join(roleDir, 'briefs', 'rule.require.reef.md'),
    );
  }

  // the record the render wrote, sound, corrupt, a dir where the file belongs, or none
  const pathRecord = join(roleDir, '.modded.json');
  if (input.record === 'corrupt') writeFileSync(pathRecord, '{ not json');
  if (input.record === 'dir') mkdirSync(pathRecord);
  if (input.record === 'sound')
    writeFileSync(
      pathRecord,
      JSON.stringify({
        sources: {
          briefs: [{ at: '', target: relative(roleDir, dirSourceBriefs) }],
          skills: [{ at: '', target: relative(roleDir, dirSourceSkills) }],
        },
        paths: [],
        hookBasis: null,
        refusal: null,
      }),
    );
  return { cwd, roleDir, dirSourceBriefs };
};

/**
 * .what = a role's published files, as paths relative to its role dir
 * .why = two temp repos hold one role at two roots; relative paths make their sets comparable
 */
const getAllRoleFilesAsPublishedRelative = (input: {
  slug: string;
  briefsAs: 'modded-view' | 'dir-link';
  record: 'sound' | 'corrupt' | 'absent' | 'dir';
}): string[] => {
  const { cwd, roleDir } = genRepoWithRoleView(input);
  return getAllRoleFilesAsPublished({
    roleDir,
    cwd,
    skipDirNames: [],
  }).files.map((file) => relative(roleDir, file));
};

describe('getAllRoleFilesAsPublished', () => {
  given(
    '[case0] the invariant: a modded view recovers the pristine role',
    () => {
      const pristine = getAllRoleFilesAsPublishedRelative({
        slug: 'files-as-published-pristine',
        briefsAs: 'dir-link',
        record: 'absent',
      });

      when('[t0] each record shape a modded view may hold is read', () => {
        then(
          '🔴 each recovers the file set of the same role never modded',
          () => {
            for (const record of ['sound', 'corrupt', 'dir'] as const)
              expect({
                record,
                files: getAllRoleFilesAsPublishedRelative({
                  slug: `files-as-published-${record}`,
                  briefsAs: 'modded-view',
                  record,
                }),
              }).toEqual({ record, files: pristine });
          },
        );
      });
    },
  );

  given('[case1] a modded view with a sound record', () => {
    const { cwd, roleDir, dirSourceBriefs } = genRepoWithRoleView({
      slug: 'files-as-published-record',
      briefsAs: 'modded-view',
      record: 'sound',
    });

    when('[t0] the published files are read', () => {
      const result = getAllRoleFilesAsPublished({
        roleDir,
        cwd,
        skipDirNames: [],
      });

      then('every published brief is listed, the not-ed one included', () => {
        expect(result.files).toContain(
          join(roleDir, 'briefs', 'rule.require.wax.md'),
        );
        expect(result.files).toContain(
          join(roleDir, 'briefs', 'rule.forbid.wipeout.md'),
        );
      });

      then('the brief the mod added is not listed (F03)', () => {
        expect(result.files).not.toContain(
          join(roleDir, 'briefs', 'rule.require.reef.md'),
        );
      });

      then('the role dir own files and the skills are listed', () => {
        expect(result.files).toContain(join(roleDir, 'readme.md'));
        expect(result.files).toContain(join(roleDir, 'skills', 'paddle.sh'));
      });

      then('the not-ed brief is read from its source dir', () => {
        const pathRead = result.asPathToRead(
          join(roleDir, 'briefs', 'rule.forbid.wipeout.md'),
        );
        expect(pathRead).toEqual(
          join(dirSourceBriefs, 'rule.forbid.wipeout.md'),
        );
        expect(readFileSync(pathRead, 'utf8')).toEqual('wipeout\n');
      });

      then('the files are sorted', () => {
        expect(result.files).toEqual([...result.files].sort());
      });
    });
  });

  given('[case2] a modded view whose record is corrupt (C11)', () => {
    const { cwd, roleDir, dirSourceBriefs } = genRepoWithRoleView({
      slug: 'files-as-published-links',
      briefsAs: 'modded-view',
      record: 'corrupt',
    });

    when('[t0] the published files are read', () => {
      const result = getAllRoleFilesAsPublished({
        roleDir,
        cwd,
        skipDirNames: [],
      });

      then('the sources are read from the file links, never thrown', () => {
        expect(result.files).toContain(
          join(roleDir, 'briefs', 'rule.forbid.wipeout.md'),
        );
        expect(
          result.asPathToRead(
            join(roleDir, 'briefs', 'rule.forbid.wipeout.md'),
          ),
        ).toEqual(join(dirSourceBriefs, 'rule.forbid.wipeout.md'));
      });

      then('the brief the mod added is not listed', () => {
        expect(result.files).not.toContain(
          join(roleDir, 'briefs', 'rule.require.reef.md'),
        );
      });

      then('the skills dir link, never modded, is walked as it is', () => {
        expect(result.files).toContain(join(roleDir, 'skills', 'paddle.sh'));
      });
    });
  });

  given(
    '[case4] a modded view whose record path is a dir, an fs errno the gate skips on',
    () => {
      const { cwd, roleDir, dirSourceBriefs } = genRepoWithRoleView({
        slug: 'files-as-published-record-dir',
        briefsAs: 'modded-view',
        record: 'dir',
      });

      when('[t0] the published files are read', () => {
        const result = getAllRoleFilesAsPublished({
          roleDir,
          cwd,
          skipDirNames: [],
        });

        then('the re-read degrades to the file links, never thrown', () => {
          expect(result.files).toContain(
            join(roleDir, 'briefs', 'rule.forbid.wipeout.md'),
          );
          expect(
            result.asPathToRead(
              join(roleDir, 'briefs', 'rule.forbid.wipeout.md'),
            ),
          ).toEqual(join(dirSourceBriefs, 'rule.forbid.wipeout.md'));
        });

        then('the brief the mod added is not listed', () => {
          expect(result.files).not.toContain(
            join(roleDir, 'briefs', 'rule.require.reef.md'),
          );
        });
      });
    },
  );

  given(
    '[case5] a skip-dir name under a source dir and under the role dir',
    () => {
      const { cwd, roleDir, dirSourceBriefs } = genRepoWithRoleView({
        slug: 'files-as-published-skip-dirs',
        briefsAs: 'modded-view',
        record: 'sound',
      });
      mkdirSync(join(dirSourceBriefs, 'node_modules'), { recursive: true });
      writeFileSync(
        join(dirSourceBriefs, 'node_modules', 'rule.require.dep.md'),
        'dep\n',
      );
      mkdirSync(join(roleDir, 'node_modules'), { recursive: true });
      writeFileSync(join(roleDir, 'node_modules', 'dep.md'), 'dep\n');

      when('[t0] the published files are read with that name to skip', () => {
        const result = getAllRoleFilesAsPublished({
          roleDir,
          cwd,
          skipDirNames: ['node_modules'],
        });

        then(
          'neither walk descends into it, as an unskipped role walk would not',
          () => {
            expect(
              result.files.filter((file) => file.includes('node_modules')),
            ).toEqual([]);
          },
        );

        then('the published files beside it are still listed', () => {
          expect(result.files).toContain(
            join(roleDir, 'briefs', 'rule.forbid.wipeout.md'),
          );
        });
      });
    },
  );

  given('[case3] a role never modded: no record, each kind a dir link', () => {
    const { cwd, roleDir } = genRepoWithRoleView({
      slug: 'files-as-published-plain',
      briefsAs: 'dir-link',
      record: 'absent',
    });

    when('[t0] the published files are read', () => {
      const result = getAllRoleFilesAsPublished({
        roleDir,
        cwd,
        skipDirNames: [],
      });

      then('the files are the walk of the role dir, sorted', () => {
        expect(result.files).toEqual(
          [
            join(roleDir, 'briefs', 'rule.forbid.wipeout.md'),
            join(roleDir, 'briefs', 'rule.require.wax.md'),
            join(roleDir, 'readme.md'),
            join(roleDir, 'skills', 'paddle.sh'),
          ].sort(),
        );
      });

      then('each path is read where it is listed', () => {
        const path = join(roleDir, 'briefs', 'rule.require.wax.md');
        expect(result.asPathToRead(path)).toEqual(path);
      });
    });
  });
});
