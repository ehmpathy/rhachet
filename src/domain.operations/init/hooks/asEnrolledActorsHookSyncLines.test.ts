import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asEnrolledActorsHookSyncLines } from './asEnrolledActorsHookSyncLines';

describe('asEnrolledActorsHookSyncLines', () => {
  given('[case1] no actor enrolled', () => {
    when('[t0] the block is rendered', () => {
      const lines = asEnrolledActorsHookSyncLines({ actors: [] });
      then('it renders no lines — no header for an empty list', () => {
        expect(lines).toEqual([]);
      });
      then('the block matches snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
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
            details: [],
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
            details: [
              {
                key: 'hint',
                value:
                  'fix the json in settings.of.repo.json, then rerun `rhx init --hooks`',
              },
            ],
          },
        ],
      });
      then('the row is the actor alone, behind ✗, with no colon', () => {
        expect(lines[1]).toEqual('   └─ ✗ hash=deadbeef');
      });
      then('the fault, with its class, leads the leaves as error = …', () => {
        expect(lines[2]).toEqual(
          '      ├─ error = ✋ ConstraintError: settings unreadable',
        );
      });
      then('the hint hangs beneath it as key = value', () => {
        expect(lines[3]).toEqual(
          '      └─ hint = fix the json in settings.of.repo.json, then rerun `rhx init --hooks`',
        );
      });
      then('the block matches snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });

    when('[t1] the fault is a helpful error with metadata', () => {
      const lines = asEnrolledActorsHookSyncLines({
        actors: [
          {
            actorExid: 'repo=ambient',
            outcome: {
              error: new MalfunctionError('settings derivation rejected', {
                actorExid: 'repo=ambient',
              }),
            },
            details: [],
          },
        ],
      });
      then(
        'the error leaf carries its class prefix once, and no metadata',
        () => {
          expect(lines[2]).toEqual(
            '      └─ error = 💥 MalfunctionError: settings derivation rejected',
          );
        },
      );
    });
  });

  given('[case4] two actors, one with naught to change', () => {
    when('[t0] the block is rendered', () => {
      const lines = asEnrolledActorsHookSyncLines({
        actors: [
          {
            actorExid: 'repo=ambient',
            outcome: { changes: '' },
            details: [],
          },
          {
            actorExid: 'hash=deadbeef',
            outcome: { changes: '+3' },
            details: [],
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
            details: [{ key: 'hint', value: 'rerun `rhx init --hooks`' }],
          },
          {
            actorExid: 'hash=bbbb2222',
            outcome: { changes: '~1' },
            details: [],
          },
        ],
      });
      then('the stem of a non-last actor carries its vertical bar', () => {
        expect(lines.slice(2)).toEqual([
          '   │  ├─ error = ✋ ConstraintError: settings unreadable',
          '   │  └─ hint = rerun `rhx init --hooks`',
          '   └─ hash=bbbb2222: ~1',
        ]);
      });
      then('the block matches snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case6] an fs fault with its roles, path and hint', () => {
    when('[t0] the block is rendered', () => {
      const lines = asEnrolledActorsHookSyncLines({
        actors: [
          {
            actorExid: 'hash=7dcf1989',
            outcome: {
              error: new ConstraintError(
                'actor settings could not be written (EACCES)',
              ),
            },
            details: [
              { key: 'roles', value: 'driver, mechanic' },
              {
                key: 'path',
                value: '.agent/.actors/actor.via.hash=7dcf1989/brain/.claude',
              },
              {
                key: 'hint',
                value:
                  'restore write access to that dir, then rerun `rhx init --hooks`',
              },
            ],
          },
          {
            actorExid: 'repo=ambient',
            outcome: { changes: '' },
            details: [],
          },
        ],
      });
      then('the roles, the path and the hint hang beneath the row', () => {
        expect(lines.slice(1, 6)).toEqual([
          '   ├─ ✗ hash=7dcf1989',
          '   │  ├─ error = ✋ ConstraintError: actor settings could not be written (EACCES)',
          '   │  ├─ roles = driver, mechanic',
          '   │  ├─ path = .agent/.actors/actor.via.hash=7dcf1989/brain/.claude',
          '   │  └─ hint = restore write access to that dir, then rerun `rhx init --hooks`',
        ]);
      });
      then('the block matches snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case7] an actor whose brain dir lands outside the repo', () => {
    when('[t0] the block is rendered', () => {
      const lines = asEnrolledActorsHookSyncLines({
        actors: [
          {
            actorExid: 'hash=7dcf1989',
            outcome: { skipped: 'outside the repo' },
            details: [],
          },
        ],
      });
      then('the row is the actor behind ⚠️, with no ✗ and no colon', () => {
        expect(lines[1]).toEqual('   └─ ⚠️ hash=7dcf1989');
      });
      then('the reason hangs beneath it as skipped = …', () => {
        expect(lines[2]).toEqual('      └─ skipped = outside the repo');
      });
      then('the block matches snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case8] a change and a skip, each with a detail of its own', () => {
    when('[t0] the block is rendered', () => {
      const lines = asEnrolledActorsHookSyncLines({
        actors: [
          {
            actorExid: 'hash=9c1e0000',
            outcome: { changes: '+1' },
            details: [{ key: 'roles', value: 'mechanic' }],
          },
          {
            actorExid: 'hash=7dcf1989',
            outcome: { skipped: 'outside the repo' },
            details: [{ key: 'roles', value: 'tester' }],
          },
        ],
      });
      then(
        'a change row holds its summary, and its detail hangs beneath it',
        () => {
          expect(lines.slice(1, 3)).toEqual([
            '   ├─ hash=9c1e0000: +1',
            '   │  └─ roles = mechanic',
          ]);
        },
      );
      then('a skip row leads with its reason, then its detail', () => {
        expect(lines.slice(3)).toEqual([
          '   └─ ⚠️ hash=7dcf1989',
          '      ├─ skipped = outside the repo',
          '      └─ roles = tester',
        ]);
      });
      then('the block matches snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });
});
