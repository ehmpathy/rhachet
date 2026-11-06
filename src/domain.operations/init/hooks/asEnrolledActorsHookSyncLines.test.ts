import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asEnrolledActorsHookSyncLines } from './asEnrolledActorsHookSyncLines';

/**
 * .what = the why tail every dropped-exclude row carries
 */
const DROP_TAIL = ' — an absolute path; the excludes keep only portable globs';

describe('asEnrolledActorsHookSyncLines', () => {
  given('[case1] no actor enrolled', () => {
    when('[t0] the block is rendered', () => {
      then('it renders no lines — no header for an empty list', () => {
        expect(asEnrolledActorsHookSyncLines({ actors: [] })).toEqual([]);
      });
    });
  });

  given('[case2] one actor whose derivation changed hooks', () => {
    when('[t0] the block is rendered', () => {
      const lines = asEnrolledActorsHookSyncLines({
        actors: [
          {
            actorExid: 'hash=9c1e0000',
            outcome: { changes: '+2, ~1, -1' },
            excludesDropped: [],
            hint: null,
          },
        ],
      });
      then('the actor row carries the change summary', () => {
        expect(lines).toEqual([
          '🧢 apply hooks to enrolled actors...',
          '   └─ hash=9c1e0000: +2, ~1, -1',
        ]);
      });
      then('the block matches snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case3] one actor whose derivation faulted, with a hint', () => {
    when('[t0] the block is rendered', () => {
      const lines = asEnrolledActorsHookSyncLines({
        actors: [
          {
            actorExid: 'hash=deadbeef',
            outcome: { error: new ConstraintError('settings unreadable') },
            excludesDropped: [],
            hint: 'fix the json in settings.of.repo.json, then rerun `rhx init --hooks`',
          },
        ],
      });
      then(
        'the row is a ✗ with the fault class, the hint hangs beneath it',
        () => {
          expect(lines[1]).toMatch(/^ {3}└─ ✗ hash=deadbeef: /);
          expect(lines[2]).toEqual(
            '      └─ hint = fix the json in settings.of.repo.json, then rerun `rhx init --hooks`',
          );
        },
      );
      then('the block matches snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case4] two actors, one with naught to change', () => {
    when('[t0] the block is rendered', () => {
      const lines = asEnrolledActorsHookSyncLines({
        actors: [
          {
            actorExid: 'repo=ambient',
            outcome: { changes: '' },
            excludesDropped: [],
            hint: null,
          },
          {
            actorExid: 'hash=deadbeef',
            outcome: { changes: '+3' },
            excludesDropped: [],
            hint: null,
          },
        ],
      });
      then('one row per actor, and no `kept aside` head', () => {
        expect(lines).toEqual([
          '🧢 apply hooks to enrolled actors...',
          '   ├─ repo=ambient',
          '   └─ hash=deadbeef: +3',
        ]);
      });
      then('the block matches snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case5] a faulted actor above another, the fault with a hint', () => {
    when('[t0] the block is rendered', () => {
      const lines = asEnrolledActorsHookSyncLines({
        actors: [
          {
            actorExid: 'hash=aaaa1111',
            outcome: { error: new ConstraintError('settings unreadable') },
            excludesDropped: [],
            hint: 'rerun `rhx init --hooks`',
          },
          {
            actorExid: 'hash=bbbb2222',
            outcome: { changes: '~1' },
            excludesDropped: [],
            hint: null,
          },
        ],
      });
      then('the stem of a non-last actor carries its vertical bar', () => {
        expect(lines.slice(2)).toEqual([
          '   │  └─ hint = rerun `rhx init --hooks`',
          '   └─ hash=bbbb2222: ~1',
        ]);
      });
      then('the block matches snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given(
    '[case6] the repo actor, whose derivation dropped two per-machine excludes',
    () => {
      when('[t0] the block is rendered', () => {
        const lines = asEnrolledActorsHookSyncLines({
          actors: [
            {
              actorExid: 'repo=ambient',
              outcome: { changes: '' },
              excludesDropped: [
                '/home/camper/.claude/CLAUDE.md',
                '/home/fixturehuman/.claude/CLAUDE.md',
              ],
              hint: null,
            },
          ],
        });
        then('each dropped exclude hangs beneath the actor row', () => {
          expect(lines).toEqual([
            '🧢 apply hooks to enrolled actors...',
            '   └─ repo=ambient',
            `      ├─ claudeMdExcludes dropped /home/camper/.claude/CLAUDE.md${DROP_TAIL}`,
            `      └─ claudeMdExcludes dropped /home/fixturehuman/.claude/CLAUDE.md${DROP_TAIL}`,
          ]);
        });
        then('the block matches snapshot', () => {
          expect(lines.join('\n')).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case7] a hash actor beside the repo actor, each with a dropped exclude',
    () => {
      when('[t0] the block is rendered', () => {
        // every dropped entry is named, whatever it names: a home literal a prior release
        //   wrote, or an absolute door of a checkout since moved (F2: a drop is never silent)
        const lines = asEnrolledActorsHookSyncLines({
          actors: [
            {
              actorExid: 'repo=ambient',
              outcome: { changes: '' },
              excludesDropped: ['/home/camper/.claude/CLAUDE.md'],
              hint: null,
            },
            {
              actorExid: 'hash=9c1e0000',
              outcome: { changes: '~1' },
              excludesDropped: [
                '/home/camper/.claude/CLAUDE.md',
                '/home/camper/git/repo-moved/.agent/.actors/actor.via.repo=ambient/brain/.claude/CLAUDE.md',
              ],
              hint: null,
            },
          ],
        });
        then('each actor carries its own dropped rows, the stem kept', () => {
          expect(lines).toEqual([
            '🧢 apply hooks to enrolled actors...',
            '   ├─ repo=ambient',
            `   │  └─ claudeMdExcludes dropped /home/camper/.claude/CLAUDE.md${DROP_TAIL}`,
            '   └─ hash=9c1e0000: ~1',
            `      ├─ claudeMdExcludes dropped /home/camper/.claude/CLAUDE.md${DROP_TAIL}`,
            `      └─ claudeMdExcludes dropped /home/camper/git/repo-moved/.agent/.actors/actor.via.repo=ambient/brain/.claude/CLAUDE.md${DROP_TAIL}`,
          ]);
        });
        then('the block matches snapshot', () => {
          expect(lines.join('\n')).toMatchSnapshot();
        });
      });
    },
  );
});
