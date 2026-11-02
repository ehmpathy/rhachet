import { given, then, when } from 'test-fns';

import { asActorRolesRederived } from './asActorRolesRederived';

describe('asActorRolesRederived', () => {
  given(
    '[case1] a `-driver` actor enrolled over [mechanic, driver, xyz]',
    () => {
      when('[t0] xyz is removed from the repo', () => {
        then(
          'the actor re-derives to the new ambient set, minus driver',
          () => {
            expect(
              asActorRolesRederived({
                brain: 'claude',
                rolesDelta: ['-driver'],
                rolesAmbient: ['mechanic', 'driver'],
                rolesLinked: ['mechanic', 'driver'],
              }),
            ).toEqual(['mechanic']);
          },
        );
      });

      when('[t1] architect is added to the repo', () => {
        then('the actor gains architect too', () => {
          expect(
            asActorRolesRederived({
              brain: 'claude',
              rolesDelta: ['-driver'],
              rolesAmbient: ['mechanic', 'driver', 'xyz', 'architect'],
              rolesLinked: ['mechanic', 'driver', 'xyz', 'architect'],
            }),
          ).toEqual(['mechanic', 'xyz', 'architect']);
        });
      });
    },
  );

  given(
    '[case2] a `+xyz` actor whose added role is removed from the repo',
    () => {
      when('[t0] it re-derives', () => {
        then('the unlinked addition drops; it never throws', () => {
          expect(
            asActorRolesRederived({
              brain: 'claude',
              rolesDelta: ['+xyz', '-driver'],
              rolesAmbient: ['mechanic', 'driver'],
              rolesLinked: ['mechanic', 'driver'],
            }),
          ).toEqual(['mechanic']);
        });
      });
    },
  );

  given(
    '[case3] a `-driver` actor whose subtracted role is removed from the repo',
    () => {
      when('[t0] it re-derives', () => {
        then('the actor holds the whole ambient set; it never throws', () => {
          expect(
            asActorRolesRederived({
              brain: 'claude',
              rolesDelta: ['-driver'],
              rolesAmbient: ['mechanic', 'architect'],
              rolesLinked: ['mechanic', 'architect'],
            }),
          ).toEqual(['mechanic', 'architect']);
        });
      });
    },
  );

  given('[case4] a `+mechanic::flow` actor (D1)', () => {
    when('[t0] the ambient set gains a role, and the actor re-derives', () => {
      then('🔴 the focus survives — never dropped as unlinked', () => {
        expect(
          asActorRolesRederived({
            brain: 'claude',
            rolesDelta: ['+mechanic::flow'],
            rolesAmbient: ['any', 'driver', 'architect'],
            rolesLinked: ['any', 'driver', 'architect', 'mechanic'],
          }),
        ).toEqual(['any', 'driver', 'architect', 'mechanic::flow']);
      });
    });
  });
});
