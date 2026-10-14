import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asEnrolledActorsHookSyncLines } from './asEnrolledActorsHookSyncLines';

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
            hint: 'fix the json in settings.of.repo.json, then rerun `rhx init --hooks`',
          },
        ],
      });
      then(
        'the row is a ✗ with the fault class, the hint hangs beneath it',
        () => {
          expect(lines[1]).toMatch(/^ {3}└─ ✗ hash=deadbeef: /);
          expect(lines[2]).toEqual(
            '      └─ hint: fix the json in settings.of.repo.json, then rerun `rhx init --hooks`',
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
            hint: null,
          },
          {
            actorExid: 'hash=deadbeef',
            outcome: { changes: '+3' },
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
            hint: 'rerun `rhx init --hooks`',
          },
          {
            actorExid: 'hash=bbbb2222',
            outcome: { changes: '~1' },
            hint: null,
          },
        ],
      });
      then('the stem of a non-last actor carries its vertical bar', () => {
        expect(lines.slice(2)).toEqual([
          '   │  └─ hint: rerun `rhx init --hooks`',
          '   └─ hash=bbbb2222: ~1',
        ]);
      });
      then('the block matches snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });
});
