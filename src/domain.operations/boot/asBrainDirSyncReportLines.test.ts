import { given, then, when } from 'test-fns';

import {
  asBrainDirSyncReportLines,
  type BrainDirSyncSymlink,
} from './asBrainDirSyncReportLines';
import { BOOT_STATS_ZERO } from './BootStats';
import type { BrainDirBootRender } from './BrainDirBootRender';

const REPO_ACTOR_BRAIN_DIR_REL =
  '.agent/.actors/actor.via.repo=ambient/brain/.claude';

/**
 * .what = one render, with every field the report reads
 */
const genRender = (
  overrides: Partial<BrainDirBootRender> = {},
): BrainDirBootRender => ({
  scope: { kind: 'repo', actorExid: 'repo=ambient' },
  bootMdPath: `/repo/${REPO_ACTOR_BRAIN_DIR_REL}/boot.md`,
  stats: { ...BOOT_STATS_ZERO, roles: 2, chars: 4096 },
  agentsMdReset: false,
  bootMdCreated: false,
  bootMdChanged: false,
  drift: null,
  ...overrides,
});

/**
 * .what = one symlink outcome
 */
const genSymlink = (
  overrides: Partial<BrainDirSyncSymlink> = {},
): BrainDirSyncSymlink => ({
  effect: 'FOUND',
  drops: [],
  moves: [],
  overwrites: [],
  carries: [],
  ...overrides,
});

describe('asBrainDirSyncReportLines', () => {
  given(
    '[case1] a full migration — moves, drops, a fresh link, a new corpus',
    () => {
      when('[t0] the lines are rendered', () => {
        const lines = asBrainDirSyncReportLines({
          render: genRender({ bootMdCreated: true, bootMdChanged: true }),
          symlink: genSymlink({
            effect: 'MIGRATED',
            drops: ['CLAUDE.md'],
            moves: ['settings.json', 'keep.json'],
          }),
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
          isManifestRepo: false,
          driftReach: null,
        });

        then('every group sits under one header, in the one order', () => {
          expect(lines).toMatchSnapshot();
        });

        then('each group is reached by a branch, never a bare line', () => {
          // the whole point of the tree: no row may read as debug chatter wedged between
          //   two adjacent treestructs (`rule.require.treestruct-output`)
          for (const line of lines.slice(1))
            expect(line.startsWith('   ')).toBe(true);
        });
      });
    },
  );

  given('[case2] a link this run created, with naught to migrate', () => {
    when('[t0] the lines are rendered', () => {
      const lines = asBrainDirSyncReportLines({
        render: genRender({ bootMdCreated: true, bootMdChanged: true }),
        symlink: genSymlink({ effect: 'CREATED' }),
        repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
        isManifestRepo: false,
        driftReach: null,
      });

      then('it names the link and the corpus, and naught else', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });

  given('[case3c] a corpus re-rendered under live clones of the actor', () => {
    when(
      '[t0] its drift reached two revisions, three clones, and one faulted',
      () => {
        const lines = asBrainDirSyncReportLines({
          render: genRender({
            drift: {
              actorDir: '/repo/.agent/.actors/a',
              revisions: ['0123456789abcdef', '1111', '2222'],
              rewritten: ['1111', '2222'],
              faults: [
                {
                  path: '/repo/.agent/.actors/a/boots/sha256=0123456789abcdef',
                  reason:
                    'drift not written (EACCES) — its clones keep their prior drift',
                  cause: new Error('EACCES'),
                },
              ],
            },
          }),
          symlink: genSymlink({ effect: 'FOUND' }),
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
          isManifestRepo: false,
          driftReach: {
            clones: 3,
            unreached: 0,
            gone: ['fedcba9876543210'],
            faults: [],
          },
        });

        then(
          'the drift is news: it names where the change went, and the revision it missed',
          () => {
            expect(lines.join('\n')).toContain('2 spawn revisions re-written');
            expect(lines.join('\n')).toContain(
              '3 clones refer to them; a live one takes the drift at its next compaction',
            );
            expect(lines.join('\n')).toContain(
              '✗ in sha256=0123456789abcdef/, drift not written',
            );
            expect(lines.join('\n')).toContain(
              '🟡 sha256=fedcba9876543210 is gone, yet a clone refers to it',
            );
            expect(lines.join('\n')).toContain('`rhx clone prune` if dead');
            expect(lines).toMatchSnapshot();
          },
        );
      },
    );

    when(
      '[t0b] its drift re-wrote revisions, but a spawn ref could not be read',
      () => {
        const lines = asBrainDirSyncReportLines({
          render: genRender({
            drift: {
              actorDir: '/repo/.agent/.actors/a',
              revisions: ['1111'],
              rewritten: ['1111'],
              faults: [],
            },
          }),
          symlink: genSymlink({ effect: 'FOUND' }),
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
          isManifestRepo: false,
          driftReach: {
            clones: null,
            unreached: null,
            gone: [],
            faults: [
              {
                path: '/repo/.agent/.actors/a/clones',
                reason: 'a spawn ref could not be read (EISDIR)',
                cause: new Error('EISDIR'),
              },
            ],
          },
        });

        then('it says the clone count is unknown, never a false zero', () => {
          expect(lines.join('\n')).toContain(
            'the clone count is unknown — a spawn ref could not be read',
          );
          expect(lines.join('\n')).not.toContain('0 clones refer');
          expect(lines.join('\n')).toContain(
            '✗ in clones/, a spawn ref could not be read (EISDIR)',
          );
          expect(lines).toMatchSnapshot();
        });
      },
    );

    when('[t1] its drift re-wrote naught', () => {
      const lines = asBrainDirSyncReportLines({
        render: genRender({
          drift: {
            actorDir: '/repo/.agent/.actors/a',
            revisions: ['1111', '2222'],
            rewritten: [],
            faults: [],
          },
        }),
        symlink: genSymlink({ effect: 'FOUND' }),
        repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
        isManifestRepo: false,
        driftReach: { clones: 2, unreached: 0, gone: [], faults: [] },
      });

      then(
        'the drift subbranch reads "no change", per vision case=6 [t1]',
        () => {
          expect(lines.join('\n')).toContain('drift');
          expect(lines.join('\n')).toContain('no change');
          expect(lines).toMatchSnapshot();
        },
      );
    });

    when('[t2] the actor holds no spawn revision yet', () => {
      const lines = asBrainDirSyncReportLines({
        render: genRender({
          drift: {
            actorDir: '/repo/.agent/.actors/a',
            revisions: [],
            rewritten: [],
            faults: [],
          },
        }),
        symlink: genSymlink({ effect: 'FOUND' }),
        repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
        isManifestRepo: false,
        driftReach: { clones: 0, unreached: 0, gone: [], faults: [] },
      });

      then('it says NAUGHT — no clone has a drift to take', () => {
        expect(lines).toEqual([]);
      });
    });

    when(
      '[t3] the actor holds clones from before boot drift, or from a resume',
      () => {
        const lines = asBrainDirSyncReportLines({
          render: genRender({
            drift: {
              actorDir: '/repo/.agent/.actors/a',
              revisions: [],
              rewritten: [],
              faults: [],
            },
          }),
          symlink: genSymlink({ effect: 'FOUND' }),
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
          isManifestRepo: false,
          driftReach: { clones: 0, unreached: 2, gone: [], faults: [] },
        });

        then(
          'it names the clones the drift cannot reach, and the respawn that cures them',
          () => {
            expect(lines.join('\n')).toContain(
              '🟡 2 clones sit outside the drift, spawned before boot drift or by a resume — respawn a live one to take the boot',
            );
            expect(lines).toMatchSnapshot();
          },
        );
      },
    );
  });

  given('[case3] a link already in place, and a corpus re-rendered', () => {
    when('[t0] the lines are rendered', () => {
      const lines = asBrainDirSyncReportLines({
        render: genRender(),
        symlink: genSymlink({ effect: 'FOUND' }),
        repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
        isManifestRepo: false,
        driftReach: null,
      });

      then('it says NAUGHT — success is not news', () => {
        // the report is silent OR it halts. a re-render that changed no fact a human can
        //   act on has no news, and the failure path is loud elsewhere
        expect(lines).toEqual([]);
      });
    });
  });

  given(
    '[case3b] a link already in place, and a corpus whose bytes changed',
    () => {
      when('[t0] the lines are rendered, in a repo with actors.yml', () => {
        const lines = asBrainDirSyncReportLines({
          render: genRender({ bootMdChanged: true }),
          symlink: genSymlink({ effect: 'FOUND' }),
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
          isManifestRepo: true,
          driftReach: null,
        });

        then(
          'it names the upgrade — a live brain dir changed under its clones',
          () => {
            // a roleset edit re-renders boot.md with new roles. silence here would hide
            //   that every clone of this actor now boots a different corpus
            expect(lines.join('\n')).toContain('changed — now 2 roles');
            expect(lines).toMatchSnapshot();
          },
        );
      });
      when('[t1] the last role left — the corpus now holds 0 roles', () => {
        const lines = asBrainDirSyncReportLines({
          render: genRender({
            bootMdChanged: true,
            stats: { ...BOOT_STATS_ZERO, roles: 0, chars: 0 },
          }),
          symlink: genSymlink({ effect: 'FOUND' }),
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
          isManifestRepo: true,
          driftReach: null,
        });

        then('it reads `emptied`, never `changed — now 0 roles`', () => {
          expect(lines.join('\n')).toContain('emptied — 0 roles');
          expect(lines.join('\n')).not.toContain('changed');
        });
      });
      when('[t2] the same changed corpus, in a repo with no actors.yml', () => {
        const lines = asBrainDirSyncReportLines({
          render: genRender({ bootMdChanged: true }),
          symlink: genSymlink({ effect: 'FOUND' }),
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
          isManifestRepo: false,
          driftReach: null,
        });

        then('it says NAUGHT — an absent actors.yml keeps today', () => {
          // the wish: an absent manifest keeps today's output. the news is a manifest's
          expect(lines).toEqual([]);
        });
      });
      when(
        '[t3] a migration beside a live corpus, in a repo with no actors.yml',
        () => {
          const lines = asBrainDirSyncReportLines({
            render: genRender({ bootMdChanged: true }),
            symlink: genSymlink({ effect: 'MIGRATED', moves: ['keep.json'] }),
            repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
            isManifestRepo: false,
            driftReach: null,
          });

          then(
            "the corpus row keeps main's words, `upgraded — N roles`",
            () => {
              // case=5: a repo with no manifest sees the frame main ships, byte for byte
              expect(lines.join('\n')).toContain('upgraded — 2 roles');
              expect(lines.join('\n')).not.toContain('changed — now');
            },
          );
        },
      );
    },
  );

  given(
    '[case4] an actor brain dir, which has no <repo>/.claude beneath it',
    () => {
      when('[t0] a first render, with no symlink', () => {
        const lines = asBrainDirSyncReportLines({
          render: genRender({
            scope: { kind: 'actor', actorExid: 'hash=051970ec' },
            bootMdCreated: true,
            bootMdChanged: true,
            stats: { ...BOOT_STATS_ZERO, roles: 1, chars: 512 },
          }),
          symlink: null,
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
          isManifestRepo: false,
          driftReach: null,
        });

        then(
          'the header names the actor, and the role word is singular',
          () => {
            expect(lines).toMatchSnapshot();
          },
        );
      });

      when('[t1] a re-render, with no symlink', () => {
        const lines = asBrainDirSyncReportLines({
          render: genRender({
            scope: { kind: 'actor', actorExid: 'hash=051970ec' },
          }),
          symlink: null,
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
          isManifestRepo: false,
          driftReach: null,
        });

        then('it says NAUGHT', () => {
          expect(lines).toEqual([]);
        });
      });
    },
  );

  given('[case4b] a move that replaced an entry the default dir held', () => {
    when('[t0] the lines are rendered', () => {
      const lines = asBrainDirSyncReportLines({
        render: genRender(),
        symlink: genSymlink({
          effect: 'MIGRATED',
          moves: ['settings.json', 'rules'],
          overwrites: ['settings.json'],
        }),
        repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
        isManifestRepo: false,
        driftReach: null,
      });

      then(
        'only the replaced row is marked — the other is a plain move',
        () => {
          // rhachet owns the dir, so a name in both is overwritten rather than refused.
          //   the human still learns WHICH row replaced a file they may want to diff
          expect(lines).toMatchSnapshot();
        },
      );
    });
  });

  given('[case5] an AGENTS.md reset, with no other change', () => {
    when('[t0] the lines are rendered', () => {
      const lines = asBrainDirSyncReportLines({
        render: genRender({ agentsMdReset: true }),
        symlink: genSymlink({ effect: 'FOUND' }),
        repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
        isManifestRepo: false,
        driftReach: null,
      });

      then(
        'the reset is never silent — the human lost hand edits (S11)',
        () => {
          expect(lines).toMatchSnapshot();
        },
      );
    });
  });

  given('[case6] a change of repo actor that carried its settings', () => {
    when('[t0] the lines are rendered', () => {
      const lines = asBrainDirSyncReportLines({
        render: genRender({
          scope: { kind: 'repo', actorExid: 'slug=crew' },
        }),
        symlink: genSymlink({
          effect: 'REWRITTEN',
          carries: [
            '.agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.repo.json',
          ],
        }),
        repoActorBrainDirRel:
          '.agent/.actors/actor.via.slug=crew/brain/.claude',
        isManifestRepo: true,
        driftReach: null,
      });

      then('the carry is named, from the former dir into the new', () => {
        expect(lines.join('\n')).toContain(
          '.agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.repo.json → .agent/.actors/actor.via.slug=crew/brain/.claude/settings.of.repo.json',
        );
        expect(lines).toMatchSnapshot();
      });
    });
  });
});
