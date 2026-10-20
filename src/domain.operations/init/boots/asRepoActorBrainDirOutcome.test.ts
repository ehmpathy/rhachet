import { MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { BOOT_STATS_ZERO } from '@src/domain.operations/boot/BootStats';
import type { BrainDirBootRender } from '@src/domain.operations/boot/BrainDirBootRender';

import { asRepoActorBrainDirOutcome } from './asRepoActorBrainDirOutcome';

const render: BrainDirBootRender = {
  scope: { kind: 'repo' },
  bootMdPath:
    '/repo/.agent/.actors/actor.via.repo=ambient/brain/.claude/boot.md',
  stats: BOOT_STATS_ZERO,
  agentsMdReset: false,
  bootMdCreated: true,
  bootMdChanged: true,
};
const symlink = {
  effect: 'CREATED' as const,
  drops: [],
  moves: [],
  overwrites: [],
};

describe('asRepoActorBrainDirOutcome', () => {
  given('[case1] a sync that fulfilled', () => {
    when('[t0] the outcome is derived', () => {
      then(
        'it carries the render, the link effect and the layout effects, and no failure',
        () => {
          const settings = {
            effects: [
              {
                kind: 'LINKED' as const,
                name: 'settings.of.grove.json',
                target: '/home/x/.claude/settings.json',
              },
            ],
            grove: {
              source: '/home/x/.claude/settings.json',
              isPresent: true,
            },
          };
          expect(
            asRepoActorBrainDirOutcome({
              settled: {
                status: 'fulfilled',
                value: {
                  render,
                  symlink,
                  settings,
                  excludesDropped: ['docs/legacy/CLAUDE.md'],
                  enrollConfigs: { deleted: [], kept: [] },
                },
              },
            }),
          ).toEqual({
            render,
            symlink,
            settings,
            excludesDropped: ['docs/legacy/CLAUDE.md'],
            failure: null,
          });
        },
      );
    });
  });

  given('[case2] a sync that rejected with an Error', () => {
    when('[t0] the outcome is derived', () => {
      then('it carries that Error as a failure under the repo scope', () => {
        const cause = new Error('EACCES');
        expect(
          asRepoActorBrainDirOutcome({
            settled: { status: 'rejected', reason: cause },
          }),
        ).toEqual({
          render: null,
          symlink: null,
          settings: null,
          excludesDropped: [],
          failure: { scope: { kind: 'repo' }, cause },
        });
      });
    });
  });

  given(
    '[case3] a sync that rejected with a value that is not an Error',
    () => {
      when('[t0] the outcome is derived', () => {
        then(
          'the value is wrapped in a MalfunctionError, so the report names a class and the value',
          () => {
            const outcome = asRepoActorBrainDirOutcome({
              settled: { status: 'rejected', reason: 'disk full' },
            });
            expect(outcome.failure?.cause).toBeInstanceOf(MalfunctionError);
            expect(outcome.failure?.cause.message).toContain(
              'repo actor brain dir sync rejected',
            );
            expect(outcome.failure?.cause.message).toContain('disk full');
          },
        );
      });
    },
  );

  given('[case4] a sync that rejected with a code defect', () => {
    when('[t0] the outcome is derived', () => {
      then('the defect is rethrown, never collected as a failure row', () => {
        const defect = new TypeError(
          "cannot read properties of undefined (reading 'render')",
        );
        expect(() =>
          asRepoActorBrainDirOutcome({
            settled: { status: 'rejected', reason: defect },
          }),
        ).toThrow(defect);
      });
    });
  });
});
