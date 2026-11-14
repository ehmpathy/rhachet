import { getError, given, then, when } from 'test-fns';

import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { asRoleRefsOfActorExpanded } from './asRoleRefsOfActorExpanded';
import type { ActorExpanded } from './getActorExpanded';

const REFS_LINKED: RoleLinkRef[] = [
  { repo: 'ehmpathy', role: 'mechanic' },
  { repo: 'ehmpathy', role: 'architect' },
  { repo: 'bhrain', role: 'driver' },
];

const asExpanded = (input: { roles: string[] }): ActorExpanded => ({
  slug: 'crew',
  brain: 'claude',
  roles: input.roles,
  rolesVia: {},
  warnings: [],
});

describe('asRoleRefsOfActorExpanded', () => {
  given('[case1] no actor (no manifest)', () => {
    when('[t0] the refs are derived', () => {
      then('every linked ref is the repo actor role set', () => {
        expect(
          asRoleRefsOfActorExpanded({
            refsLinked: REFS_LINKED,
            expanded: null,
          }),
        ).toEqual(REFS_LINKED);
      });
    });
  });

  given('[case2] an actor whose every role is linked', () => {
    when('[t0] the refs are derived', () => {
      then('only the declared roles remain', () => {
        expect(
          asRoleRefsOfActorExpanded({
            refsLinked: REFS_LINKED,
            expanded: asExpanded({
              roles: ['ehmpathy/mechanic', 'bhrain/driver'],
            }),
          }),
        ).toEqual([
          { repo: 'ehmpathy', role: 'mechanic' },
          { repo: 'bhrain', role: 'driver' },
        ]);
      });
    });
  });

  given('[case3] an actor that declares a role not linked', () => {
    when('[t0] the refs are derived', () => {
      then('it is refused, names the role, and names `rhx init`', async () => {
        const error = await getError(() =>
          asRoleRefsOfActorExpanded({
            refsLinked: REFS_LINKED,
            expanded: asExpanded({
              roles: ['ehmpathy/mechanic', 'ehmpathy/ergonomist'],
            }),
          }),
        );
        expect(error.message).toContain(
          "@crew declares role 'ehmpathy/ergonomist', which is not linked",
        );
        expect(error.message).toContain('run `rhx init`');
      });
    });
  });
});
