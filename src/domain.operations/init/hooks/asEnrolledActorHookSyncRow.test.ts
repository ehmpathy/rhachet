import { MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asEnrolledActorHookSyncRow } from './asEnrolledActorHookSyncRow';

describe('asEnrolledActorHookSyncRow', () => {
  given('[case1] a derivation that changed hooks', () => {
    when('[t0] the row is rendered', () => {
      then('it names the actor and the change summary', () => {
        expect(
          asEnrolledActorHookSyncRow({
            actorExid: 'hash=051970ec',
            outcome: { changes: '+2, ~1' },
          }),
        ).toEqual('hash=051970ec: +2, ~1');
      });
    });
  });

  given('[case2] a derivation that changed naught', () => {
    when('[t0] the row is rendered', () => {
      then('it names the actor alone', () => {
        expect(
          asEnrolledActorHookSyncRow({
            actorExid: 'hash=051970ec',
            outcome: { changes: '' },
          }),
        ).toEqual('hash=051970ec');
      });
    });
  });

  given('[case3] a derivation that faulted', () => {
    when('[t0] the fault is a plain error', () => {
      then('the row leads with ✗ and carries the class token', () => {
        expect(
          asEnrolledActorHookSyncRow({
            actorExid: 'hash=051970ec',
            outcome: { error: new Error('EACCES: permission denied') },
          }),
        ).toEqual('✗ hash=051970ec: Error: EACCES: permission denied');
      });
    });

    when('[t1] the fault is a helpful error', () => {
      then('the row carries its own class prefix, once', () => {
        const row = asEnrolledActorHookSyncRow({
          actorExid: 'repo=ambient',
          outcome: {
            error: new MalfunctionError('settings derivation rejected', {
              actorExid: 'repo=ambient',
            }),
          },
        });
        expect(row.startsWith('✗ repo=ambient: ')).toEqual(true);
        expect(row).toContain('MalfunctionError');
        expect(row).toContain('settings derivation rejected');
        expect(row).not.toContain('"actorExid"');
      });
    });
  });
});
