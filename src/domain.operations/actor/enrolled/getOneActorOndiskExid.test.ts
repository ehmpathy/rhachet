import { given, then, when } from 'test-fns';

import type { ContextOfRepoRoles } from '@src/domain.objects/ContextOfRepoRoles';

import { REPO_ACTOR_EXID } from './constants';
import { genEnrollmentHash } from './genEnrollmentHash';
import { genEnrollmentHashOfDelta } from './genEnrollmentHashOfDelta';
import { getOneActorOndiskExid } from './getOneActorOndiskExid';

const context: ContextOfRepoRoles = {
  repo: { ambient: { roles: ['mechanic', 'driver', 'ergonomist'] } },
};

describe('getOneActorOndiskExid', () => {
  given('[case1] a bare enroll — the roles are the ambient set', () => {
    when('[t0] the exid is derived', () => {
      then('it is the repo actor', () => {
        expect(
          getOneActorOndiskExid(
            { brain: 'claude', roles: ['mechanic', 'driver', 'ergonomist'] },
            context,
          ),
        ).toEqual(REPO_ACTOR_EXID);
      });
    });
  });

  given(
    '[case2] `--roles` that name exactly the ambient set, in another order',
    () => {
      when('[t0] the exid is derived', () => {
        then('it collapses into the repo actor', () => {
          expect(
            getOneActorOndiskExid(
              { brain: 'claude', roles: ['ergonomist', 'mechanic', 'driver'] },
              context,
            ),
          ).toEqual(REPO_ACTOR_EXID);
        });
      });
    },
  );

  given('[case3] `--roles -driver` — a specific roleset', () => {
    when('[t0] the exid is derived', () => {
      then('it is the hash actor of that roleset', () => {
        expect(
          getOneActorOndiskExid(
            { brain: 'claude', roles: ['mechanic', 'ergonomist'] },
            context,
          ),
        ).toEqual(
          `hash=${genEnrollmentHash({ brain: 'claude', roles: ['mechanic', 'ergonomist'] })}`,
        );
      });
    });
  });

  given('[case4] a superset of the ambient roles', () => {
    when('[t0] the exid is derived', () => {
      then('it is a hash actor, never the repo actor', () => {
        expect(
          getOneActorOndiskExid(
            {
              brain: 'claude',
              roles: ['mechanic', 'driver', 'ergonomist', 'architect'],
            },
            context,
          ),
        ).toMatch(/^hash=[0-9a-f]{8}$/);
      });
    });
  });

  given('[case5] a repo with no ambient roles, and a bare enroll', () => {
    when('[t0] the exid is derived', () => {
      then('the empty roleset is ambient, so it is the repo actor', () => {
        expect(
          getOneActorOndiskExid(
            { brain: 'claude', roles: [] },
            { repo: { ambient: { roles: [] } } },
          ),
        ).toEqual(REPO_ACTOR_EXID);
      });
    });
  });

  given('[case6] a delta enroll — `-driver`', () => {
    when('[t0] the exid is derived', () => {
      then(
        'it is the hash of the delta, not of the roles it resolves to',
        () => {
          expect(
            getOneActorOndiskExid(
              {
                brain: 'claude',
                roles: ['mechanic', 'ergonomist'],
                rolesDelta: ['-driver'],
              },
              context,
            ),
          ).toEqual(
            `hash=${genEnrollmentHashOfDelta({ brain: 'claude', rolesDelta: ['-driver'] })}`,
          );
        },
      );
    });
  });

  given(
    '[case7] a delta whose roles equal the ambient set — `+mechanic`',
    () => {
      when('[t0] the exid is derived', () => {
        then('the ambient set wins: it is the repo actor', () => {
          expect(
            getOneActorOndiskExid(
              {
                brain: 'claude',
                roles: ['mechanic', 'driver', 'ergonomist'],
                rolesDelta: ['+mechanic'],
              },
              context,
            ),
          ).toEqual(REPO_ACTOR_EXID);
        });
      });
    },
  );
});
