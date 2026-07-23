import { given, then, when } from 'test-fns';

import { getRolesSpaceFormCollision } from './getRolesSpaceFormCollision';

// a representative set of linked roles for the collision check
const ROLES_LINKED = ['mechanic', 'reviewer', 'driver', 'architect'];

describe('getRolesSpaceFormCollision', () => {
  given(
    '[case1] an unquoted multi-delta space form naming a linked role',
    () => {
      when('[t0] `--roles -driver -reviewer` is scanned', () => {
        then('the second role token `-reviewer` is the collision', () => {
          const out = getRolesSpaceFormCollision({
            rawArgs: ['--roles', '-driver', '-reviewer'],
            rolesLinked: ROLES_LINKED,
          });
          expect(out).toEqual('-reviewer');
        });
      });

      when(
        '[t1] the `-r` short alias `-r -driver -reviewer` is scanned',
        () => {
          then('the collision is still detected past the alias', () => {
            const out = getRolesSpaceFormCollision({
              rawArgs: ['-r', '-driver', '-reviewer'],
              rolesLinked: ROLES_LINKED,
            });
            expect(out).toEqual('-reviewer');
          });
        },
      );

      when(
        '[t2] the inline form `--roles=-driver -reviewer` is scanned',
        () => {
          then(
            'the extra token right after the inline flag is the collision',
            () => {
              const out = getRolesSpaceFormCollision({
                rawArgs: ['--roles=-driver', '-reviewer'],
                rolesLinked: ROLES_LINKED,
              });
              expect(out).toEqual('-reviewer');
            },
          );
        },
      );

      when(
        '[t3] a bare second role `--roles mechanic reviewer` is scanned',
        () => {
          then('the bare linked role is the collision', () => {
            const out = getRolesSpaceFormCollision({
              rawArgs: ['--roles', 'mechanic', 'reviewer'],
              rolesLinked: ROLES_LINKED,
            });
            expect(out).toEqual('reviewer');
          });
        },
      );
    },
  );

  given(
    '[case2] a single-role spec with a brain passthrough short flag',
    () => {
      when(
        '[t0] `--roles -driver -v` is scanned (`-v` is not a linked role)',
        () => {
          then('there is no collision — `-v` is a passthrough flag', () => {
            const out = getRolesSpaceFormCollision({
              rawArgs: ['--roles', '-driver', '-v'],
              rolesLinked: ROLES_LINKED,
            });
            expect(out).toEqual(null);
          });
        },
      );
    },
  );

  given('[case3] the safe comma form (a single value token)', () => {
    when('[t0] `--roles -driver,-reviewer` is scanned', () => {
      then('there is no collision — both deltas ride in one token', () => {
        const out = getRolesSpaceFormCollision({
          rawArgs: ['--roles', '-driver,-reviewer'],
          rolesLinked: ROLES_LINKED,
        });
        expect(out).toEqual(null);
      });
    });
  });

  given('[case4] a single-role spec with no trailing token', () => {
    when('[t0] `--roles mechanic` is scanned', () => {
      then('there is no collision', () => {
        const out = getRolesSpaceFormCollision({
          rawArgs: ['--roles', 'mechanic'],
          rolesLinked: ROLES_LINKED,
        });
        expect(out).toEqual(null);
      });
    });
  });

  given('[case5] args with no roles flag at all', () => {
    when('[t0] `--hooks claude` is scanned', () => {
      then('there is no collision', () => {
        const out = getRolesSpaceFormCollision({
          rawArgs: ['--hooks', 'claude'],
          rolesLinked: ROLES_LINKED,
        });
        expect(out).toEqual(null);
      });
    });
  });

  given('[case6] a repo-qualified extra role after the value', () => {
    when('[t0] `--roles -driver -ehmpathy/reviewer` is scanned', () => {
      then('the qualified token resolves to a linked slug and collides', () => {
        const out = getRolesSpaceFormCollision({
          rawArgs: ['--roles', '-driver', '-ehmpathy/reviewer'],
          rolesLinked: ROLES_LINKED,
        });
        expect(out).toEqual('-ehmpathy/reviewer');
      });
    });
  });
});
