import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import {
  genSampleRepoWithLinkedRole,
  putSampleFile,
} from '@src/.test/assets/genSampleRepoWithLinkedRole';

import {
  existsSync,
  lstatSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { assertRoleModdedViewFresh } from './assertRoleModdedViewFresh';
import { getAllRoleModDriftsOfRepo } from './getAllRoleModDriftsOfRepo';
import { getOneRoleModForRoleDir } from './getOneRoleModForRoleDir';
import { syncRoleModdedViews } from './syncRoleModdedViews';

const REF = { repo: 'ehmpathy', role: 'mechanic' };

const genRepoWithLinkedRole = genSampleRepoWithLinkedRole;
const putFile = putSampleFile;

describe('syncRoleModdedViews', () => {
  given('[case1] a repo with no mod', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithLinkedRole({
        slug: 'mods-sync-none',
        withMod: false,
      });
      const result = await syncRoleModdedViews({}, repo.context);
      return { ...repo, result };
    });

    when('[t0] the views are synced', () => {
      then('no refusal is returned, and no view is named as changed', () => {
        expect(scene.result.refusals).toEqual([]);
        expect(scene.result.changed).toEqual([]);
      });

      then(
        'the layout `roles link` left is untouched: a dir link, no record',
        () => {
          expect(
            lstatSync(join(scene.roleDir, 'briefs')).isSymbolicLink(),
          ).toEqual(true);
          expect(existsSync(join(scene.roleDir, '.modded.json'))).toEqual(
            false,
          );
        },
      );

      then('the boot check reads the role as unmodded', () => {
        expect(
          assertRoleModdedViewFresh({
            cwd: scene.repo,
            ref: REF,
            getRefsLinked: () => [REF],
          }),
        ).toEqual(null);
      });
    });
  });

  given('[case2] a mod that shadows, adds, and nots', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithLinkedRole({
        slug: 'mods-sync-apply',
        withMod: true,
      });
      const result = await syncRoleModdedViews({}, repo.context);
      return { ...repo, result };
    });

    when('[t0] the views are synced', () => {
      then('no refusal is returned', () => {
        expect(scene.result.refusals).toEqual([]);
      });

      then(
        'the role is named as changed, so the render can warn live clones',
        () => {
          expect(scene.result.changed).toEqual(['mechanic']);
        },
      );

      then('the kind dir becomes a real dir of per-file links', () => {
        expect(lstatSync(join(scene.roleDir, 'briefs')).isDirectory()).toEqual(
          true,
        );
        expect(
          lstatSync(join(scene.roleDir, 'briefs')).isSymbolicLink(),
        ).toEqual(false);
      });

      then('the shadow and the add point into the mod dir', () => {
        for (const name of [
          'rule.require.surf-wax.md',
          'rule.require.reef-etiquette.md',
        ])
          expect(realpathSync(join(scene.roleDir, 'briefs', name))).toEqual(
            join(scene.modDir, 'briefs', name),
          );
      });

      then('the not-ed brief is absent from the view', () => {
        expect(
          existsSync(join(scene.roleDir, 'briefs', 'rule.forbid.wipeouts.md')),
        ).toEqual(false);
      });

      then('an untouched kind still points at the store', () => {
        expect(
          realpathSync(join(scene.roleDir, 'skills', 'wax.board.sh')),
        ).toContain(join('node_modules', 'rhachet-roles-ehmpathy'));
      });

      then('the boot check passes, with the plan', () => {
        const mod = assertRoleModdedViewFresh({
          cwd: scene.repo,
          ref: REF,
          getRefsLinked: () => [REF],
        });
        expect(mod?.ofLabel).toEqual(
          'ehmpathy/mechanic@1.39.5 (installed 1.40.0)',
        );
        expect(mod?.plan.shadows).toEqual(['briefs/rule.require.surf-wax.md']);
      });

      then('the pin of 1.39.5 against an install of 1.40.0 is a drift', () => {
        const { drifts, refusals } = getAllRoleModDriftsOfRepo(
          {},
          scene.context,
        );
        expect(refusals).toEqual([]);
        expect(drifts).toHaveLength(1);
        expect(drifts[0]).toMatchObject({
          role: 'ehmpathy/mechanic',
          versionDeclared: '1.39.5',
          versionInstalled: '1.40.0',
        });
      });
    });

    when('[t1] the views are synced again', () => {
      const resync = useBeforeAll(async () => {
        const pathLink = join(scene.roleDir, 'briefs', 'howto.paddle-out.md');
        const before = {
          target: readlinkSync(pathLink),
          ctimeNs: lstatSync(pathLink, { bigint: true }).ctimeNs,
        };
        const result = await syncRoleModdedViews({}, scene.context);
        const after = {
          target: readlinkSync(pathLink),
          ctimeNs: lstatSync(pathLink, { bigint: true }).ctimeNs,
        };
        return { before, after, result };
      });

      then('the view is the same, so a resync is idempotent', () => {
        expect(resync.result.refusals).toEqual([]);
        expect(resync.result.changed).toEqual([]);
        expect(resync.after.target).toEqual(resync.before.target);
        expect(
          assertRoleModdedViewFresh({
            cwd: scene.repo,
            ref: REF,
            getRefsLinked: () => [REF],
          }),
        ).not.toEqual(null);
      });

      then(
        'a fresh view is not rebuilt: each link is the one the first render made',
        () => {
          // a link rebuilt in place may reuse its inode number, but never its change time
          expect(resync.after.ctimeNs).toEqual(resync.before.ctimeNs);
        },
      );
    });
  });

  given('[case3] a mod edited after the last render', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithLinkedRole({
        slug: 'mods-sync-stale',
        withMod: true,
      });
      await syncRoleModdedViews({}, repo.context);
      putFile({
        path: join(repo.modDir, 'briefs', 'howto.paddle-out.md'),
        content: 'paddle out, modded',
      });
      return repo;
    });

    when('[t0] a boot checks the view', () => {
      then(
        'it fails loud, names the path, and names the render that fixes it',
        async () => {
          const error = await getError(async () =>
            assertRoleModdedViewFresh({
              cwd: scene.repo,
              ref: REF,
              getRefsLinked: () => [REF],
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('is stale');
          expect(JSON.stringify(error)).toContain('briefs/howto.paddle-out.md');
          expect(JSON.stringify(error)).toContain('rhx init');
        },
      );

      then('the boot wrote no file: the view still points at the store', () => {
        expect(
          realpathSync(join(scene.roleDir, 'briefs', 'howto.paddle-out.md')),
        ).toContain('node_modules');
      });
    });

    when('[t1] the views are synced', () => {
      then('the view is fresh again', async () => {
        await syncRoleModdedViews({}, scene.context);
        expect(
          assertRoleModdedViewFresh({
            cwd: scene.repo,
            ref: REF,
            getRefsLinked: () => [REF],
          })?.plan.shadows,
        ).toEqual([
          'briefs/howto.paddle-out.md',
          'briefs/rule.require.surf-wax.md',
        ]);
      });
    });
  });

  given('[case4] a mod deleted after the last render', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithLinkedRole({
        slug: 'mods-sync-gone',
        withMod: true,
      });
      await syncRoleModdedViews({}, repo.context);
      rmSync(repo.modDir, { recursive: true });
      return repo;
    });

    when('[t0] a boot checks the view before a render', () => {
      then('it fails loud: the mod dir was removed', async () => {
        const error = await getError(async () =>
          assertRoleModdedViewFresh({
            cwd: scene.repo,
            ref: REF,
            getRefsLinked: () => [REF],
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('its mod dir was removed');
      });
    });

    when('[t1] the views are synced', () => {
      then(
        'the role returns to its published layout, and the record is gone',
        async () => {
          await syncRoleModdedViews({}, scene.context);
          expect(
            lstatSync(join(scene.roleDir, 'briefs')).isSymbolicLink(),
          ).toEqual(true);
          expect(
            existsSync(
              join(scene.roleDir, 'briefs', 'rule.forbid.wipeouts.md'),
            ),
          ).toEqual(true);
          expect(existsSync(join(scene.roleDir, '.modded.json'))).toEqual(
            false,
          );
          expect(
            assertRoleModdedViewFresh({
              cwd: scene.repo,
              ref: REF,
              getRefsLinked: () => [REF],
            }),
          ).toEqual(null);
        },
      );
    });
  });

  given('[case5] a mod the render cannot apply', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithLinkedRole({
        slug: 'mods-sync-refused',
        withMod: true,
      });
      putFile({
        path: join(repo.modDir, 'briefs', 'rule.require.surf-wux.md'),
        content: 'a typo of a held path',
      });
      const result = await syncRoleModdedViews({}, repo.context);
      return { ...repo, result };
    });

    when('[t0] the views are synced', () => {
      then('the refusal is returned, for the role', () => {
        expect(scene.result.refusals.map((one) => one.role)).toEqual([
          'mechanic',
        ]);
      });

      then('the role is left unmodded', () => {
        expect(
          lstatSync(join(scene.roleDir, 'briefs')).isSymbolicLink(),
        ).toEqual(true);
      });

      then('a boot of the role raises the refusal again', async () => {
        const error = await getError(async () =>
          assertRoleModdedViewFresh({
            cwd: scene.repo,
            ref: REF,
            getRefsLinked: () => [REF],
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('rule.require.surf-wux.md');
      });
    });
  });

  given('[case6] a file no link made, inside a modded view', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithLinkedRole({
        slug: 'mods-sync-stray',
        withMod: true,
      });
      await syncRoleModdedViews({}, repo.context);

      // a stray file in the view, then a mod change that needs a rebuild
      putFile({
        path: join(repo.roleDir, 'briefs', 'notes.md'),
        content: 'a note a human left',
      });
      putFile({
        path: join(repo.modDir, 'briefs', 'howto.paddle-out.md'),
        content: 'paddle out, modded',
      });
      const result = await syncRoleModdedViews({}, repo.context);
      return { ...repo, result };
    });

    when('[t0] the views are synced', () => {
      then('the swap is refused, for the role, as a constraint', () => {
        expect(scene.result.refusals.map((one) => one.role)).toContain(
          'mechanic',
        );
        expect(
          scene.result.refusals.every(
            (one) => one.error instanceof ConstraintError,
          ),
        ).toEqual(true);
        expect(scene.result.refusals[0]?.error.message).toContain(
          'holds a file no link made',
        );
      });

      then(
        'the role dir is left as it was: the file and the old view stay',
        () => {
          expect(existsSync(join(scene.roleDir, 'briefs', 'notes.md'))).toEqual(
            true,
          );
          expect(
            realpathSync(join(scene.roleDir, 'briefs', 'howto.paddle-out.md')),
          ).toContain('node_modules');
          expect(
            realpathSync(
              join(scene.roleDir, 'briefs', 'rule.require.surf-wax.md'),
            ),
          ).toEqual(join(scene.modDir, 'briefs', 'rule.require.surf-wax.md'));
        },
      );

      then(
        'a boot of the role raises the refusal, and names the render',
        async () => {
          const error = await getError(async () =>
            assertRoleModdedViewFresh({
              cwd: scene.repo,
              ref: REF,
              getRefsLinked: () => [REF],
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('holds a file no link made');
          expect(JSON.stringify(error)).toContain('rhx init --hooks');
        },
      );
    });

    when('[t1] the mod changes again before a render', () => {
      then(
        'the boot names the render, never the refusal of a mod that moved',
        async () => {
          putFile({
            path: join(scene.modDir, 'briefs', 'rule.require.tide-chart.md'),
            content: 'read the tide',
          });
          putFile({
            path: join(scene.modDir, 'boot.yml'),
            content: [
              'of: ehmpathy/mechanic@1.39.5',
              'briefs:',
              '  say:',
              '    - briefs/rule.require.reef-etiquette.md',
              '    - briefs/rule.require.tide-chart.md',
              '  not:',
              '    - briefs/rule.forbid.wipeouts.md',
              '',
            ].join('\n'),
          });
          const error = await getError(async () =>
            assertRoleModdedViewFresh({
              cwd: scene.repo,
              ref: REF,
              getRefsLinked: () => [REF],
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain(
            'the mod changed after the last render refused it',
          );
          expect(JSON.stringify(error)).toContain('rhx init --hooks');
        },
      );
    });

    when('[t2] the file is moved out, and the views are synced', () => {
      then('the view is rebuilt and fresh', async () => {
        rmSync(join(scene.roleDir, 'briefs', 'notes.md'));
        const result = await syncRoleModdedViews({}, scene.context);
        expect(result.refusals).toEqual([]);
        expect(
          assertRoleModdedViewFresh({
            cwd: scene.repo,
            ref: REF,
            getRefsLinked: () => [REF],
          })?.plan.adds,
        ).toEqual([
          'briefs/rule.require.reef-etiquette.md',
          'briefs/rule.require.tide-chart.md',
        ]);
      });
    });
  });

  given(
    '[case8] a relink that clears a modded view, with no mod change',
    () => {
      const scene = useBeforeAll(async () => {
        const repo = genRepoWithLinkedRole({
          slug: 'mods-sync-relink',
          withMod: true,
        });
        const first = await syncRoleModdedViews({}, repo.context);

        // a relink clears each kind dir and links the published dir again, as `roles link` does
        for (const kind of ['briefs', 'skills']) {
          rmSync(join(repo.roleDir, kind), { recursive: true, force: true });
          symlinkSync(
            relative(repo.roleDir, join(repo.store, kind)),
            join(repo.roleDir, kind),
            'dir',
          );
        }
        const second = await syncRoleModdedViews({}, repo.context);
        return { ...repo, first, second };
      });

      when('[t0] the views are synced again', () => {
        then('the first render named the role as changed', () => {
          expect(scene.first.changed).toEqual(['mechanic']);
        });

        then(
          'the rebuild names no change, so no live-clone line is printed',
          () => {
            expect(scene.second.changed).toEqual([]);
            expect(scene.second.refusals).toEqual([]);
          },
        );

        then('the view is rebuilt, so the boot reads the mod', () => {
          expect(
            lstatSync(join(scene.roleDir, 'briefs')).isSymbolicLink(),
          ).toEqual(false);
          expect(
            realpathSync(
              join(scene.roleDir, 'briefs', 'rule.require.surf-wax.md'),
            ),
          ).toEqual(join(scene.modDir, 'briefs', 'rule.require.surf-wax.md'));
        });
      });
    },
  );

  given('[case9] a regular file where a kind dir belongs', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithLinkedRole({
        slug: 'mods-sync-kindfile',
        withMod: true,
      });
      rmSync(join(repo.roleDir, 'briefs'));
      writeFileSync(join(repo.roleDir, 'briefs'), 'a file a human left');
      const result = await syncRoleModdedViews({}, repo.context);
      return { ...repo, result };
    });

    when('[t0] the views are synced', () => {
      then('the swap is refused, for the role', () => {
        expect(scene.result.refusals.map((one) => one.role)).toContain(
          'mechanic',
        );
        expect(
          scene.result.refusals.map((one) => one.error.message).join('\n'),
        ).toContain('a linked role dir holds a file no link made');
      });

      then('the file is kept, never removed', () => {
        expect(lstatSync(join(scene.roleDir, 'briefs')).isFile()).toEqual(true);
      });
    });
  });

  given('[case10] a mod whose of names no linked role', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithLinkedRole({
        slug: 'mods-sync-unplaced',
        withMod: false,
      });
      putFile({
        path: join(repo.repo, '.agent', 'repo=.mods', 'role=surfr', 'boot.yml'),
        content: 'of: ehmpathy/surfr\n',
      });
      const result = await syncRoleModdedViews({}, repo.context);
      return { ...repo, result };
    });

    when('[t0] the views are synced', () => {
      then(
        'the refusal is returned as unplaced, since no boot raises it',
        () => {
          expect(scene.result.unplaced.map((one) => one.role)).toEqual([
            'surfr',
          ]);
        },
      );
    });
  });

  given(
    '[case10.3] a stray entry under .agent/repo=.mods, beside a sound mod (usecase 12)',
    () => {
      const scene = useBeforeAll(async () => {
        const repo = genRepoWithLinkedRole({
          slug: 'mods-sync-stray',
          withMod: true,
        });
        putFile({
          path: join(repo.repo, '.agent', 'repo=.mods', 'readme.md'),
          content: 'notes on our mods\n',
        });
        const result = await syncRoleModdedViews({}, repo.context);
        return { ...repo, result };
      });

      when('[t0] the views are synced', () => {
        then('the sync does not throw, and refuses no role', () => {
          expect(scene.result.refusals).toEqual([]);
        });

        then('the sound mod still applies to its view', () => {
          expect(scene.result.changed).toEqual(['mechanic']);
          expect(
            realpathSync(
              join(scene.roleDir, 'briefs', 'rule.require.surf-wax.md'),
            ),
          ).toEqual(join(scene.modDir, 'briefs', 'rule.require.surf-wax.md'));
        });

        then('the stray is named as unplaced, with the rename fix', () => {
          expect(scene.result.unplaced.map((one) => one.role)).toEqual([
            'readme.md',
          ]);
          const [stray] = scene.result.unplaced;
          const error = stray?.error;
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error?.message).toContain('names no role');
          expect(JSON.stringify(error)).toContain(
            'rename .agent/repo=.mods/readme.md to .agent/repo=.mods/role=<slug>',
          );
        });
      });
    },
  );

  given(
    '[case10.4] a stray entry under .agent/repo=.mods, with no mod at all',
    () => {
      const scene = useBeforeAll(async () => {
        const repo = genRepoWithLinkedRole({
          slug: 'mods-sync-stray-alone',
          withMod: false,
        });
        putFile({
          path: join(repo.repo, '.agent', 'repo=.mods', 'readme.md'),
          content: 'notes on our mods\n',
        });
        const result = await syncRoleModdedViews({}, repo.context);
        return { ...repo, result };
      });

      when('[t0] the views are synced', () => {
        then('the stray is named as unplaced, and no view changes', () => {
          expect(scene.result.unplaced.map((one) => one.role)).toEqual([
            'readme.md',
          ]);
          expect(scene.result.changed).toEqual([]);
          expect(
            lstatSync(join(scene.roleDir, 'briefs')).isSymbolicLink(),
          ).toEqual(true);
        });
      });
    },
  );

  given('[case10.1] a mod whose of names a native .this role (F18)', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithLinkedRole({
        slug: 'mods-sync-native-pinned',
        withMod: false,
      });
      const roleDirNative = join(
        repo.repo,
        '.agent',
        'repo=.this',
        'role=surfer',
      );
      putFile({
        path: join(roleDirNative, 'boot.yml'),
        content: 'briefs:\n  say:\n    - briefs/rule.require.paddle.md\n',
      });
      putFile({
        path: join(roleDirNative, 'briefs', 'rule.require.paddle.md'),
        content: 'paddle hard',
      });
      putFile({
        path: join(
          repo.repo,
          '.agent',
          'repo=.mods',
          'role=surfer',
          'boot.yml',
        ),
        content: 'of: .this/surfer\n',
      });
      const result = await syncRoleModdedViews({}, repo.context);
      return { ...repo, result, roleDirNative };
    });

    when('[t0] the views are synced', () => {
      then('the refusal is returned for the native role', () => {
        expect(scene.result.refusals.map((one) => one.role)).toEqual([
          'surfer',
        ]);
      });

      then(
        'it is not unplaced, since the boot of the native role raises it',
        () => {
          expect(scene.result.unplaced).toEqual([]);
        },
      );
    });

    when('[t1] the native role boots', () => {
      then(
        'its boot refuses the mod, and names the in-place edit',
        async () => {
          const error = await getError(async () =>
            getOneRoleModForRoleDir({ roleDir: scene.roleDirNative }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('names a role this repo owns');
          expect(error.message).toContain(
            'edit .agent/repo=.this/role=surfer/ in place, and delete the mod',
          );
        },
      );
    });
  });

  given(
    '[case10.2] a mod pinned to an unlinked repo, beside a native role of its slug',
    () => {
      const scene = useBeforeAll(async () => {
        const repo = genRepoWithLinkedRole({
          slug: 'mods-sync-native-beside',
          withMod: false,
        });
        const roleDirNative = join(
          repo.repo,
          '.agent',
          'repo=.this',
          'role=surfer',
        );
        putFile({
          path: join(roleDirNative, 'boot.yml'),
          content: 'briefs:\n  say:\n    - briefs/rule.require.paddle.md\n',
        });
        putFile({
          path: join(roleDirNative, 'briefs', 'rule.require.paddle.md'),
          content: 'paddle hard',
        });
        putFile({
          path: join(
            repo.repo,
            '.agent',
            'repo=.mods',
            'role=surfer',
            'boot.yml',
          ),
          content: 'of: acme/surfer\n',
        });
        const result = await syncRoleModdedViews({}, repo.context);
        return { ...repo, result, roleDirNative };
      });

      when('[t0] the views are synced', () => {
        then(
          'the refusal is returned as unplaced: the native role does not carry a mod over another repo',
          () => {
            expect(scene.result.unplaced.map((one) => one.role)).toEqual([
              'surfer',
            ]);
          },
        );
      });

      when('[t1] the native role boots', () => {
        then('it boots as it stands, since the mod does not name it', () => {
          expect(
            getOneRoleModForRoleDir({ roleDir: scene.roleDirNative }),
          ).toEqual(null);
        });
      });
    },
  );

  given(
    '[case11] a mod of a linked role, refused for a path the role does not hold',
    () => {
      const scene = useBeforeAll(async () => {
        const repo = genRepoWithLinkedRole({
          slug: 'mods-sync-refused-placed',
          withMod: false,
        });
        putFile({
          path: join(repo.modDir, 'boot.yml'),
          content: 'of: ehmpathy/mechanic\n',
        });
        putFile({
          path: join(repo.modDir, 'briefs', 'rule.require.surf-wux.md'),
          content: 'a typo of a held path',
        });
        const result = await syncRoleModdedViews({}, repo.context);
        return { ...repo, result };
      });

      when('[t0] the views are synced', () => {
        then('the refusal is returned', () => {
          expect(scene.result.refusals.map((one) => one.role)).toContain(
            'mechanic',
          );
        });

        then(
          'it is not unplaced, since the boot of its linked role raises it',
          () => {
            expect(scene.result.unplaced).toEqual([]);
          },
        );
      });
    },
  );

  given(
    '[case12] an unreadable view record, on a role whose mod is gone',
    () => {
      const scene = useBeforeAll(async () => {
        const repo = genRepoWithLinkedRole({
          slug: 'mods-sync-corrupt-record',
          withMod: true,
        });
        await syncRoleModdedViews({}, repo.context);
        rmSync(repo.modDir, { recursive: true });
        writeFileSync(join(repo.roleDir, '.modded.json'), '{ not json');
        return repo;
      });

      when('[t0] the views are synced', () => {
        then(
          'the walk does not throw; the fault is that role refusal alone',
          async () => {
            const result = await syncRoleModdedViews({}, scene.context);
            expect(result.refusals.map((one) => one.role)).toEqual([
              'mechanic',
            ]);
            expect(result.refusals[0]?.error.message).toContain(
              'the modded view record is unreadable',
            );
          },
        );
      });
    },
  );

  given(
    '[case12.1] an unreadable view record, on a role whose mod is live',
    () => {
      const scene = useBeforeAll(async () => {
        const repo = genRepoWithLinkedRole({
          slug: 'mods-sync-corrupt-record-live',
          withMod: true,
        });
        await syncRoleModdedViews({}, repo.context);
        writeFileSync(join(repo.roleDir, '.modded.json'), '{ not json');
        return repo;
      });

      when('[t0] the views are synced', () => {
        then(
          'the walk does not throw; the fault is that role refusal alone, named once',
          async () => {
            const result = await syncRoleModdedViews({}, scene.context);
            expect(result.refusals.map((one) => one.role)).toEqual([
              'mechanic',
            ]);
            expect(result.refusals[0]?.error.message).toContain(
              'the modded view record is unreadable',
            );
          },
        );
      });
    },
  );

  given('[case13] os and editor leftovers inside a mod dir', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithLinkedRole({
        slug: 'mods-sync-leftovers',
        withMod: true,
      });
      for (const name of [
        '.DS_Store',
        'briefs/.DS_Store',
        'briefs/rule.require.surf-wax.md~',
        'briefs/.rule.require.surf-wax.md.swp',
      ])
        putFile({ path: join(repo.modDir, name), content: 'leftover' });
      const result = await syncRoleModdedViews({}, repo.context);
      return { ...repo, result };
    });

    when('[t0] the views are synced', () => {
      then('no leftover is refused, and none enters the view', () => {
        expect(scene.result.refusals).toEqual([]);
        expect(
          existsSync(
            join(scene.roleDir, 'briefs', 'rule.require.surf-wax.md~'),
          ),
        ).toEqual(false);
      });
    });
  });

  given('[case14] kind dirs a cut-short view swap left behind', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithLinkedRole({
        slug: 'mods-sync-swap-leftovers',
        withMod: true,
      });
      await syncRoleModdedViews({}, repo.context);

      // a crash between the build and the rename leaves a next dir and a prior dir
      for (const name of [
        'briefs.next.4242.0a1b2c3d',
        'skills.prior.4242.0a1b2c3d',
      ]) {
        putFile({ path: join(repo.roleDir, name, '.keep-dir'), content: '' });
        rmSync(join(repo.roleDir, name, '.keep-dir'));
        symlinkSync(
          join(repo.modDir, 'briefs', 'rule.require.surf-wax.md'),
          join(repo.roleDir, name, 'rule.require.surf-wax.md'),
        );
      }
      const result = await syncRoleModdedViews({}, repo.context);
      return { ...repo, result };
    });

    when('[t0] the views are synced again', () => {
      then('each leftover is removed, and no refusal is returned', () => {
        expect(scene.result.refusals).toEqual([]);
        expect(
          existsSync(join(scene.roleDir, 'briefs.next.4242.0a1b2c3d')),
        ).toEqual(false);
        expect(
          existsSync(join(scene.roleDir, 'skills.prior.4242.0a1b2c3d')),
        ).toEqual(false);
      });

      then('the file a leftover link named is untouched', () => {
        expect(
          existsSync(join(scene.modDir, 'briefs', 'rule.require.surf-wax.md')),
        ).toEqual(true);
      });
    });
  });

  given('[case7] a not of a skill, over a package that does not load', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithLinkedRole({
        slug: 'mods-sync-unloadable',
        withMod: false,
      });
      putFile({
        path: join(repo.modDir, 'boot.yml'),
        content: [
          'of: ehmpathy/mechanic',
          'skills:',
          '  not:',
          '    - skills/wax.board.sh',
          '',
        ].join('\n'),
      });
      const result = await syncRoleModdedViews({}, repo.context);
      return { ...repo, result };
    });

    when('[t0] the views are synced', () => {
      then('the mod is refused: no hook can be checked', () => {
        expect(scene.result.refusals.map((one) => one.role)).toEqual([
          'mechanic',
        ]);
        expect(scene.result.refusals[0]?.error.message).toContain(
          'its package did not load',
        );
      });

      then('the skill the mod would not is still in the view', () => {
        expect(
          existsSync(join(scene.roleDir, 'skills', 'wax.board.sh')),
        ).toEqual(true);
      });
    });
  });
});
