import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import {
  genSampleRepoWithLinkedRole,
  putSampleFile,
} from '@src/.test/assets/genSampleRepoWithLinkedRole';

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { setRoleModdedView } from './setRoleModdedView';

/**
 * .what = the sample repo, with a mod that also shadows the skill wax.board.sh
 * .note = the shadow sources its peer wax.lib.sh by its own dir, as a published skill does
 */
const genRepoWithSkillShadow = (input: { slug: string }) => {
  const repo = genSampleRepoWithLinkedRole({ slug: input.slug, withMod: true });
  putSampleFile({
    path: join(repo.modDir, 'skills', 'wax.board.sh'),
    content:
      'source "$(dirname "${BASH_SOURCE[0]}")/wax.lib.sh"\necho "modded: $(wax_word)"\n',
  });
  return repo;
};

/**
 * .what = the view the sample mod plans, written to the role dir
 * .note = the sources and links are stated as the plan would derive them, so this suite holds
 *   the write alone: a shadow of surf-wax and wax.board, an add of reef-etiquette, a not of
 *   wipeouts, every other published file kept
 */
const setViewOfMod = (input: {
  roleDir: string;
  store: string;
  modDir: string;
}): void =>
  setRoleModdedView({
    roleDir: input.roleDir,
    sources: {
      briefs: [
        {
          at: '',
          target: relative(input.roleDir, join(input.store, 'briefs')),
        },
      ],
      skills: [
        {
          at: '',
          target: relative(input.roleDir, join(input.store, 'skills')),
        },
      ],
    },
    links: new Map([
      [
        'briefs/howto.paddle-out.md',
        join(input.store, 'briefs', 'howto.paddle-out.md'),
      ],
      [
        'briefs/rule.require.reef-etiquette.md',
        join(input.modDir, 'briefs', 'rule.require.reef-etiquette.md'),
      ],
      [
        'briefs/rule.require.surf-wax.md',
        join(input.modDir, 'briefs', 'rule.require.surf-wax.md'),
      ],
      ['skills/wax.board.sh', join(input.modDir, 'skills', 'wax.board.sh')],
      ['skills/wax.lib.sh', join(input.store, 'skills', 'wax.lib.sh')],
    ]),
    hookBasis: null,
  });

/**
 * .what = each file in a kind dir of the view, by name, to the path it resolves to
 */
const getAllViewFiles = (input: {
  roleDir: string;
  kind: 'briefs' | 'skills';
}): Record<string, string> =>
  Object.fromEntries(
    readdirSync(join(input.roleDir, input.kind))
      .sort()
      .map((entry) => [
        entry,
        realpathSync(join(input.roleDir, input.kind, entry)),
      ]),
  );

describe('setRoleModdedView', () => {
  given(
    '[case1] a mod that shadows a skill which sources its published peer',
    () => {
      const scene = useBeforeAll(async () => {
        const repo = genRepoWithSkillShadow({ slug: 'mods-view-skill' });
        setViewOfMod(repo);
        return repo;
      });

      when('[t0] the view is written', () => {
        then('the skills kind dir becomes a real dir of per-file links', () => {
          const stats = lstatSync(join(scene.roleDir, 'skills'));
          expect(stats.isSymbolicLink()).toEqual(false);
          expect(stats.isDirectory()).toEqual(true);
          expect(
            lstatSync(
              join(scene.roleDir, 'skills', 'wax.board.sh'),
            ).isSymbolicLink(),
          ).toEqual(true);
        });

        then(
          'the shadow points into the mod dir; its peer into the store',
          () => {
            expect(
              getAllViewFiles({ roleDir: scene.roleDir, kind: 'skills' }),
            ).toEqual({
              'wax.board.sh': realpathSync(
                join(scene.modDir, 'skills', 'wax.board.sh'),
              ),
              'wax.lib.sh': realpathSync(
                join(scene.store, 'skills', 'wax.lib.sh'),
              ),
            });
          },
        );

        then('the shadow, run from the view, finds its published peer', () => {
          const result = spawnSync('bash', [
            join(scene.roleDir, 'skills', 'wax.board.sh'),
          ]);
          expect(result.status).toEqual(0);
          expect(result.stdout.toString().trim()).toEqual('modded: waxed');
        });

        then(
          'the briefs view holds the shadow and the add, the not absent',
          () => {
            expect(
              getAllViewFiles({ roleDir: scene.roleDir, kind: 'briefs' }),
            ).toEqual({
              'howto.paddle-out.md': realpathSync(
                join(scene.store, 'briefs', 'howto.paddle-out.md'),
              ),
              'rule.require.reef-etiquette.md': realpathSync(
                join(scene.modDir, 'briefs', 'rule.require.reef-etiquette.md'),
              ),
              'rule.require.surf-wax.md': realpathSync(
                join(scene.modDir, 'briefs', 'rule.require.surf-wax.md'),
              ),
            });
          },
        );

        then(
          'the record names the published sources and the sorted plan paths',
          () => {
            const record = JSON.parse(
              readFileSync(join(scene.roleDir, '.modded.json'), 'utf-8'),
            );
            expect(record.refusal).toEqual(null);
            expect(record.sources.briefs).toHaveLength(1);
            expect(record.sources.skills).toHaveLength(1);
            expect(record.paths).toEqual([
              'briefs/howto.paddle-out.md',
              'briefs/rule.require.reef-etiquette.md',
              'briefs/rule.require.surf-wax.md',
              'skills/wax.board.sh',
              'skills/wax.lib.sh',
            ]);
          },
        );
      });

      when('[t1] the view is written again, with no change', () => {
        then('the view is the same: the write is idempotent', () => {
          const before = {
            briefs: getAllViewFiles({ roleDir: scene.roleDir, kind: 'briefs' }),
            skills: getAllViewFiles({ roleDir: scene.roleDir, kind: 'skills' }),
            record: readFileSync(join(scene.roleDir, '.modded.json'), 'utf-8'),
          };
          setViewOfMod(scene);
          expect({
            briefs: getAllViewFiles({ roleDir: scene.roleDir, kind: 'briefs' }),
            skills: getAllViewFiles({ roleDir: scene.roleDir, kind: 'skills' }),
            record: readFileSync(join(scene.roleDir, '.modded.json'), 'utf-8'),
          }).toEqual(before);
        });
      });
    },
  );

  given(
    '[case2] a regular file inside a kind dir the view would replace',
    () => {
      const scene = useBeforeAll(async () => {
        const repo = genSampleRepoWithLinkedRole({
          slug: 'mods-view-stray',
          withMod: true,
        });

        // the briefs kind dir as a real dir: one link, and one file no link made
        rmSync(join(repo.roleDir, 'briefs'));
        putSampleFile({
          path: join(repo.roleDir, 'briefs', 'notes.md'),
          content: 'a note a human left',
        });
        symlinkSync(
          relative(
            join(repo.roleDir, 'briefs'),
            join(repo.store, 'briefs', 'howto.paddle-out.md'),
          ),
          join(repo.roleDir, 'briefs', 'howto.paddle-out.md'),
        );
        const error = await getError(async () =>
          setRoleModdedView({
            roleDir: repo.roleDir,
            sources: { briefs: [], skills: [] },
            links: new Map([
              [
                'briefs/howto.paddle-out.md',
                join(repo.store, 'briefs', 'howto.paddle-out.md'),
              ],
            ]),
            hookBasis: null,
          }),
        );
        return { ...repo, error };
      });

      when('[t0] the view is written', () => {
        then('the swap is refused as a constraint that names the file', () => {
          expect(scene.error).toBeInstanceOf(ConstraintError);
          expect(scene.error.message).toContain('holds a file no link made');
          expect(JSON.stringify(scene.error)).toContain('notes.md');
        });

        then(
          'the role dir is untouched: the file kept, no record written',
          () => {
            expect(
              readFileSync(join(scene.roleDir, 'briefs', 'notes.md'), 'utf-8'),
            ).toEqual('a note a human left');
            expect(existsSync(join(scene.roleDir, '.modded.json'))).toEqual(
              false,
            );
            expect(
              lstatSync(join(scene.roleDir, 'skills')).isSymbolicLink(),
            ).toEqual(true);
          },
        );
      });
    },
  );
});
