import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { RoleModTarget } from '@src/domain.objects/RoleModTarget';

import { getOneRoleModTargetLinked } from './getOneRoleModTargetLinked';

const REFS_LINKED = [
  { repo: '.this', role: 'mechanic' },
  { repo: 'ehmpathy', role: 'mechanic' },
  { repo: 'bhrain', role: 'driver' },
  { repo: 'zeta', role: 'driver' },
];

const asOf = (input: { repo: string | null; role: string }) =>
  new RoleModTarget({ ...input, version: null });

describe('getOneRoleModTargetLinked', () => {
  given('[case1] an of that names one linked role', () => {
    when('[t0] the repo is pinned', () => {
      then('the pinned ref is found', () => {
        expect(
          getOneRoleModTargetLinked({
            of: asOf({ repo: 'zeta', role: 'driver' }),
            refsLinked: REFS_LINKED,
          }),
        ).toEqual({ repo: 'zeta', role: 'driver' });
      });
    });

    when(
      '[t1] a bare slug that one package ships, beside a .this role of that slug',
      () => {
        then(
          'the package ref is found; the .this role is never a candidate',
          () => {
            expect(
              getOneRoleModTargetLinked({
                of: asOf({ repo: null, role: 'mechanic' }),
                refsLinked: REFS_LINKED,
              }),
            ).toEqual({ repo: 'ehmpathy', role: 'mechanic' });
          },
        );
      },
    );
  });

  given('[case2] an of no lookup can settle', () => {
    when('[t0] a bare slug two packages ship', () => {
      then('it is refused, and the fix pins one', async () => {
        const error = await getError(async () =>
          getOneRoleModTargetLinked({
            of: asOf({ repo: null, role: 'driver' }),
            refsLinked: REFS_LINKED,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('matches 2 linked roles');
        expect(JSON.stringify(error)).toContain('of: bhrain/driver');
      });
    });

    when('[t1] a pinned repo that is not linked', () => {
      then('it is refused, and names the linked one', async () => {
        const error = await getError(async () =>
          getOneRoleModTargetLinked({
            of: asOf({ repo: 'bhuild', role: 'mechanic' }),
            refsLinked: REFS_LINKED,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('not linked');
        expect(JSON.stringify(error)).toContain('ehmpathy/mechanic');
      });
    });

    when('[t2] a bare slug no package ships', () => {
      then('it is refused', async () => {
        const error = await getError(async () =>
          getOneRoleModTargetLinked({
            of: asOf({ repo: null, role: 'surfer' }),
            refsLinked: REFS_LINKED,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('not linked');
      });
    });

    when('[t3] a .this role', () => {
      then(
        'it is refused, and the fix is to edit it in place (F18)',
        async () => {
          const error = await getError(async () =>
            getOneRoleModTargetLinked({
              of: asOf({ repo: '.this', role: 'mechanic' }),
              refsLinked: REFS_LINKED,
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('a role this repo owns');
          expect(JSON.stringify(error)).toContain('in place');
        },
      );
    });
  });
});
