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
    when('[t0] the row is rendered', () => {
      then(
        'it is the actor alone, behind ✗: the fault hangs beneath it',
        () => {
          expect(
            asEnrolledActorHookSyncRow({
              actorExid: 'hash=051970ec',
              outcome: { error: new Error('EACCES: permission denied') },
            }),
          ).toEqual('✗ hash=051970ec');
        },
      );
    });
  });

  given('[case4] a derivation that was skipped', () => {
    when('[t0] the row is rendered', () => {
      then(
        'it is the actor alone, behind ⚠️: the reason hangs beneath it',
        () => {
          expect(
            asEnrolledActorHookSyncRow({
              actorExid: 'hash=7dcf1989',
              outcome: { skipped: 'outside the repo' },
            }),
          ).toEqual('⚠️ hash=7dcf1989');
        },
      );
    });
  });
});
