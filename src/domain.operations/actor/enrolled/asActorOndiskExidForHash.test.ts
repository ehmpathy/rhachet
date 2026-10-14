import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import type { ContextOfRepoRoles } from '@src/domain.objects/ContextOfRepoRoles';

import { asActorOndiskExidForHash } from './asActorOndiskExidForHash';

const context: ContextOfRepoRoles = {
  repo: { ambient: { roles: ['mechanic', 'driver', 'ergonomist'] } },
};

describe('asActorOndiskExidForHash', () => {
  given('[case1] the ambient roleset', () => {
    when('[t0] a hash exid is minted for it', () => {
      then(
        'the clamp throws — the ambient roles belong to the repo actor',
        async () => {
          const error = await getError(async () =>
            asActorOndiskExidForHash(
              { brain: 'claude', roles: ['driver', 'mechanic', 'ergonomist'] },
              context,
            ),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain('ambient roles');
        },
      );
    });
  });

  given('[case2] a specific roleset', () => {
    when('[t0] a hash exid is minted for it', () => {
      then('it is `hash=<8 hex>`', () => {
        expect(
          asActorOndiskExidForHash(
            { brain: 'claude', roles: ['mechanic'] },
            context,
          ),
        ).toMatch(/^hash=[0-9a-f]{8}$/);
      });
    });
  });

  given(
    '[case3] a `-driver` delta actor before and after xyz leaves the repo',
    () => {
      when('[t0] its exid is minted against each ambient set', () => {
        then('the exid holds — one actor, re-derived', () => {
          const before = asActorOndiskExidForHash(
            {
              brain: 'claude',
              roles: ['mechanic', 'xyz'],
              rolesDelta: ['-driver'],
            },
            { repo: { ambient: { roles: ['mechanic', 'driver', 'xyz'] } } },
          );
          const after = asActorOndiskExidForHash(
            { brain: 'claude', roles: ['mechanic'], rolesDelta: ['-driver'] },
            { repo: { ambient: { roles: ['mechanic', 'driver'] } } },
          );
          expect(after).toEqual(before);
        });
      });
    },
  );

  given('[case4] an absolute actor with the same concrete roles', () => {
    when('[t0] both exids are minted', () => {
      then('the delta actor and the absolute actor are two actors', () => {
        const contextTwo = {
          repo: { ambient: { roles: ['mechanic', 'driver'] } },
        };
        const delta = asActorOndiskExidForHash(
          { brain: 'claude', roles: ['mechanic'], rolesDelta: ['-driver'] },
          contextTwo,
        );
        const absolute = asActorOndiskExidForHash(
          { brain: 'claude', roles: ['mechanic'] },
          contextTwo,
        );
        expect(delta).not.toEqual(absolute);
      });
    });
  });
});
