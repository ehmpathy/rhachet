import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { RoleModPlan } from '@src/domain.objects/RoleModPlan';
import { RoleModSpec } from '@src/domain.objects/RoleModSpec';
import { RoleModTarget } from '@src/domain.objects/RoleModTarget';
import { asRepoMutexHeldError } from '@src/infra/lock/asRepoMutexHeldError';

import { getOneRoleModVerdict } from './getOneRoleModVerdict';

/**
 * .what = a sound mod, as the freshness proof returns it
 */
const MOD_SOUND = {
  spec: new RoleModSpec({
    of: new RoleModTarget({ repo: 'test', role: 'surfer', version: '1.0.0' }),
    sections: null,
  }),
  plan: new RoleModPlan({
    shadows: ['briefs/rule.require.wax.md'],
    adds: [],
    nots: [],
    minsDropped: [],
  }),
  ofLabel: 'test/surfer@1.0.0',
};

/**
 * .what = a read that throws the given value
 */
const asReadThatThrows = (input: { thrown: unknown }) => ({
  read: (): null => {
    throw input.thrown;
  },
});

describe('getOneRoleModVerdict', () => {
  // cwd null runs the read once, with no lock, so each case reads its own read alone
  const input = { cwd: null };

  given('[case1] a role no mod is over', () => {
    when('[t0] the gate reads it', () => {
      then('the verdict is published', async () => {
        const verdict = await getOneRoleModVerdict(input, { read: () => null });
        expect(verdict).toEqual({ verdict: 'published' });
      });
    });
  });

  given('[case2] a role with a sound mod', () => {
    when('[t0] the gate reads it', () => {
      then('the verdict is modded, and carries the mod', async () => {
        const verdict = await getOneRoleModVerdict(input, {
          read: () => MOD_SOUND,
        });
        expect(verdict).toEqual({ verdict: 'modded', ...MOD_SOUND });
      });
    });
  });

  given('[case3] a mod the read refuses with a constraint', () => {
    const refusal = new ConstraintError('a mod is refused', {
      fix: 'delete the line',
    });

    when('[t0] the gate reads it', () => {
      then(
        'the verdict is skipped, with the refusal, never thrown',
        async () => {
          const verdict = await getOneRoleModVerdict(
            input,
            asReadThatThrows({ thrown: refusal }),
          );
          expect(verdict).toEqual({ verdict: 'skipped', error: refusal });
        },
      );
    });
  });

  given('[case4] a corrupt record, which raises a malfunction', () => {
    const malfunction = new MalfunctionError('the record is unreadable', {
      fix: 'delete the record',
    });

    when('[t0] the gate reads it', () => {
      then('the verdict is skipped, with the malfunction (F04)', async () => {
        const verdict = await getOneRoleModVerdict(
          input,
          asReadThatThrows({ thrown: malfunction }),
        );
        expect(verdict).toEqual({ verdict: 'skipped', error: malfunction });
      });
    });
  });

  given('[case5] an fs errno on a path the mod holds', () => {
    const errno = Object.assign(new Error('EACCES: permission denied'), {
      code: 'EACCES',
      path: '/repo/.agent/repo=.mods/role=surfer/boot.yml',
    });

    when('[t0] the gate reads it', () => {
      then(
        'the verdict is skipped, with the errno classed as a refusal that names its fix',
        async () => {
          const verdict = await getOneRoleModVerdict(
            input,
            asReadThatThrows({ thrown: errno }),
          );
          expect(verdict.verdict).toEqual('skipped');
          const error = verdict.verdict === 'skipped' ? verdict.error : null;
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error?.message).toContain('EACCES: permission denied');
          expect(error?.message).toContain(
            'grant read access, via chmod u+r .agent/repo=.mods/role=surfer/boot.yml',
          );
        },
      );
    });
  });

  given('[case6] a code defect in the read', () => {
    when('[t0] the gate reads it', () => {
      then('the defect throws loud, never named as a mod fault', async () => {
        const error = await getError(
          getOneRoleModVerdict(
            input,
            asReadThatThrows({
              thrown: new TypeError('cannot read properties of undefined'),
            }),
          ),
        );
        expect(error).toBeInstanceOf(TypeError);
        expect(error.message).toContain('cannot read properties');
      });
    });
  });

  given('[case7] an unclassed error, which no mod fault raises', () => {
    when('[t0] the gate reads it', () => {
      then('it throws loud, never named as a mod fault', async () => {
        const error = await getError(
          getOneRoleModVerdict(
            input,
            asReadThatThrows({ thrown: new Error('a helper misbehaved') }),
          ),
        );
        expect(error.message).toEqual('a helper misbehaved');
      });
    });
  });

  given('[case8] a thrown value that is no error', () => {
    when('[t0] the gate reads it', () => {
      then('it throws loud, the value unchanged', async () => {
        const thrown = await getOneRoleModVerdict(
          input,
          asReadThatThrows({ thrown: 'a bare string' }),
        ).catch((error: unknown) => error);
        expect(thrown).toEqual('a bare string');
      });
    });
  });

  given('[case9] a repo lock another rhx process held past the wait', () => {
    when('[t0] the gate reads it', () => {
      then(
        'it throws loud, never named as a fault of a sound mod',
        async () => {
          const held = asRepoMutexHeldError({
            path: '/repo/.agent/repo=test/role=surfer',
            waitMs: 120_000,
            cause: new Error('acquire timed out'),
          });
          const error = await getError(
            getOneRoleModVerdict(input, asReadThatThrows({ thrown: held })),
          );
          expect(error).toBe(held);
        },
      );
    });
  });
});
