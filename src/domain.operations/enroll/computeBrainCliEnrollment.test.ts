import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { BrainCliEnrollmentSpec } from '@src/domain.objects/BrainCliEnrollmentSpec';
import { RoleDelta } from '@src/domain.objects/RoleDelta';

import { computeBrainCliEnrollment } from './computeBrainCliEnrollment';

describe('computeBrainCliEnrollment', () => {
  const rolesLinked = ['mechanic', 'driver', 'ergonomist', 'architect'];
  const rolesAmbient = ['mechanic', 'driver', 'ergonomist'];
  const brain = 'claude';

  given('[case1] absolute mode with single role', () => {
    when('[t0] spec replaces with mechanic', () => {
      then('returns manifest with only mechanic', () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'absolute',
          deltas: [new RoleDelta({ kind: 'absolute', role: 'mechanic' })],
        });
        const result = computeBrainCliEnrollment({
          brain,
          spec,
          rolesAmbient,
          rolesLinked,
        });
        expect(result.brain).toEqual('claude');
        expect(result.roles).toEqual(['mechanic']);
      });
    });
  });

  given('[case2] absolute mode with multiple roles', () => {
    when('[t0] spec replaces with mechanic and architect', () => {
      then('returns manifest with only those two', () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'absolute',
          deltas: [
            new RoleDelta({ kind: 'absolute', role: 'mechanic' }),
            new RoleDelta({ kind: 'absolute', role: 'architect' }),
          ],
        });
        const result = computeBrainCliEnrollment({
          brain,
          spec,
          rolesAmbient,
          rolesLinked,
        });
        expect(result.roles).toEqual(['mechanic', 'architect']);
      });
    });
  });

  given('[case3] incremental mode with append', () => {
    when('[t0] spec appends architect to defaults', () => {
      then('returns defaults plus architect', () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'incremental',
          deltas: [new RoleDelta({ kind: 'addition', role: 'architect' })],
        });
        const result = computeBrainCliEnrollment({
          brain,
          spec,
          rolesAmbient,
          rolesLinked,
        });
        expect(result.roles).toContain('mechanic');
        expect(result.roles).toContain('driver');
        expect(result.roles).toContain('ergonomist');
        expect(result.roles).toContain('architect');
        expect(result.roles).toHaveLength(4);
      });
    });
  });

  given('[case4] incremental mode with subtract', () => {
    when('[t0] spec subtracts driver from defaults', () => {
      then('returns defaults minus driver', () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'incremental',
          deltas: [new RoleDelta({ kind: 'subtraction', role: 'driver' })],
        });
        const result = computeBrainCliEnrollment({
          brain,
          spec,
          rolesAmbient,
          rolesLinked,
        });
        expect(result.roles).toContain('mechanic');
        expect(result.roles).toContain('ergonomist');
        expect(result.roles).not.toContain('driver');
        expect(result.roles).toHaveLength(2);
      });
    });
  });

  given('[case5] incremental mode with mixed deltas', () => {
    when('[t0] spec removes driver and adds architect', () => {
      then('returns defaults minus driver plus architect', () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'incremental',
          deltas: [
            new RoleDelta({ kind: 'subtraction', role: 'driver' }),
            new RoleDelta({ kind: 'addition', role: 'architect' }),
          ],
        });
        const result = computeBrainCliEnrollment({
          brain,
          spec,
          rolesAmbient,
          rolesLinked,
        });
        expect(result.roles).toContain('mechanic');
        expect(result.roles).toContain('ergonomist');
        expect(result.roles).toContain('architect');
        expect(result.roles).not.toContain('driver');
        expect(result.roles).toHaveLength(3);
      });
    });
  });

  given('[case6] typo in role name', () => {
    when('[t0] spec has "mechnic" instead of "mechanic"', () => {
      then('throws ConstraintError with suggestion', async () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'absolute',
          deltas: [new RoleDelta({ kind: 'absolute', role: 'mechnic' })],
        });
        const error = await getError(() =>
          computeBrainCliEnrollment({
            brain,
            spec,
            rolesAmbient,
            rolesLinked,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain("role 'mechnic' not found");
        expect(error.message).toContain("did you mean 'mechanic'?");
      });
    });

    when('[t1] spec has "drivr" instead of "driver"', () => {
      then('throws ConstraintError with suggestion', async () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'incremental',
          deltas: [new RoleDelta({ kind: 'subtraction', role: 'drivr' })],
        });
        const error = await getError(() =>
          computeBrainCliEnrollment({
            brain,
            spec,
            rolesAmbient,
            rolesLinked,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain("role 'drivr' not found");
        expect(error.message).toContain("did you mean 'driver'?");
      });
    });
  });

  given('[case7] unknown role with no close match', () => {
    when('[t0] spec has "xyzabc" which has no close match', () => {
      then('throws ConstraintError without suggestion', async () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'absolute',
          deltas: [new RoleDelta({ kind: 'absolute', role: 'xyzabc' })],
        });
        const error = await getError(() =>
          computeBrainCliEnrollment({
            brain,
            spec,
            rolesAmbient,
            rolesLinked,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain("role 'xyzabc' not found");
        expect(error.message).not.toContain('did you mean');
      });
    });
  });

  given('[case8] idempotent subtract of absent role', () => {
    when('[t0] spec subtracts architect which is not in defaults', () => {
      then('returns defaults unchanged (no-op)', () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'incremental',
          deltas: [new RoleDelta({ kind: 'subtraction', role: 'architect' })],
        });
        const result = computeBrainCliEnrollment({
          brain,
          spec,
          rolesAmbient,
          rolesLinked,
        });
        expect(result.roles).toEqual(rolesAmbient);
      });
    });
  });

  given('[case9] idempotent append of present role', () => {
    when('[t0] spec appends mechanic which is already in defaults', () => {
      then('returns defaults unchanged (no-op)', () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'incremental',
          deltas: [new RoleDelta({ kind: 'addition', role: 'mechanic' })],
        });
        const result = computeBrainCliEnrollment({
          brain,
          spec,
          rolesAmbient,
          rolesLinked,
        });
        expect(result.roles).toEqual(rolesAmbient);
      });
    });
  });

  given('[case10] absolute mode ignores defaults', () => {
    when('[t0] spec replaces with architect only', () => {
      then('returns only architect, ignores all defaults', () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'absolute',
          deltas: [new RoleDelta({ kind: 'absolute', role: 'architect' })],
        });
        const result = computeBrainCliEnrollment({
          brain,
          spec,
          rolesAmbient,
          rolesLinked,
        });
        expect(result.roles).toEqual(['architect']);
        expect(result.roles).not.toContain('mechanic');
        expect(result.roles).not.toContain('driver');
        expect(result.roles).not.toContain('ergonomist');
      });
    });
  });

  given('[case11] empty rolesLinked', () => {
    when('[t0] no roles are linked in .agent/', () => {
      then('throws ConstraintError for any role', async () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'absolute',
          deltas: [new RoleDelta({ kind: 'absolute', role: 'mechanic' })],
        });
        const error = await getError(() =>
          computeBrainCliEnrollment({
            brain,
            spec,
            rolesAmbient: [],
            rolesLinked: [],
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain("role 'mechanic' not found");
      });
    });
  });

  given('[case-focus] a role at a subject focus', () => {
    const asIncremental = (tokens: string[]) =>
      new BrainCliEnrollmentSpec({
        mode: 'incremental',
        deltas: tokens.map(
          (token) => new RoleDelta({ kind: 'addition', role: token }),
        ),
      });

    when('[t0] an exact set names mechanic::flow', () => {
      then('the focus is kept, validated by its role', () => {
        const result = computeBrainCliEnrollment({
          brain,
          spec: new BrainCliEnrollmentSpec({
            mode: 'absolute',
            deltas: [
              new RoleDelta({ kind: 'absolute', role: 'driver' }),
              new RoleDelta({ kind: 'absolute', role: 'mechanic::flow' }),
            ],
          }),
          rolesAmbient,
          rolesLinked,
        });
        expect(result.roles).toEqual(['driver', 'mechanic::flow']);
      });
    });

    when('[t1] +mechanic::flow atop an ambient mechanic whole (S3)', () => {
      then('the entry narrows in place — never mechanic beside it', () => {
        const result = computeBrainCliEnrollment({
          brain,
          spec: asIncremental(['mechanic::flow']),
          rolesAmbient,
          rolesLinked,
        });
        expect(result.roles).toEqual([
          'mechanic::flow',
          'driver',
          'ergonomist',
        ]);
      });
    });

    when('[t2] +mechanic::code.prod atop a held mechanic::flow (E3)', () => {
      then('the focus moves — never flow and code.prod side by side', () => {
        const result = computeBrainCliEnrollment({
          brain,
          spec: asIncremental(['mechanic::code.prod']),
          rolesAmbient: ['mechanic::flow', 'driver'],
          rolesLinked,
        });
        expect(result.roles).toEqual(['mechanic::code.prod', 'driver']);
      });
    });

    when('[t3] +mechanic atop a held mechanic::flow (E4)', () => {
      then('the entry widens to the whole role', () => {
        const result = computeBrainCliEnrollment({
          brain,
          spec: asIncremental(['mechanic']),
          rolesAmbient: ['mechanic::flow', 'driver'],
          rolesLinked,
        });
        expect(result.roles).toEqual(['mechanic', 'driver']);
      });
    });

    when('[t4] -mechanic atop a held mechanic::flow (P11)', () => {
      then('the focused entry is removed whole', () => {
        const result = computeBrainCliEnrollment({
          brain,
          spec: new BrainCliEnrollmentSpec({
            mode: 'incremental',
            deltas: [new RoleDelta({ kind: 'subtraction', role: 'mechanic' })],
          }),
          rolesAmbient: ['mechanic::flow', 'driver'],
          rolesLinked,
        });
        expect(result.roles).toEqual(['driver']);
      });
    });

    when('[t5] +mechanic::flow atop a held mechanic::flow (E2)', () => {
      then('it is a no-op', () => {
        const result = computeBrainCliEnrollment({
          brain,
          spec: asIncremental(['mechanic::flow']),
          rolesAmbient: ['mechanic::flow', 'driver'],
          rolesLinked,
        });
        expect(result.roles).toEqual(['mechanic::flow', 'driver']);
      });
    });

    when('[t6] a focus on a role that is not linked (L2)', () => {
      then('it meets the unlinked refusal, named by its role', async () => {
        const error = await getError(() =>
          computeBrainCliEnrollment({
            brain,
            spec: asIncremental(['reviewer::flow']),
            rolesAmbient,
            rolesLinked,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain("role 'reviewer' not found");
        expect(error.message).toContain('linked roles: mechanic');
        expect(error.message).toMatchSnapshot();
      });
    });

    when(
      '[t6.b] an exact set `mechanic::101,flow` — a subject typed without its role',
      () => {
        then('it names the one-subject-per-token form', async () => {
          const error = await getError(() =>
            computeBrainCliEnrollment({
              brain,
              spec: new BrainCliEnrollmentSpec({
                mode: 'absolute',
                deltas: [
                  new RoleDelta({ kind: 'absolute', role: 'mechanic::101' }),
                  new RoleDelta({ kind: 'absolute', role: 'flow' }),
                ],
              }),
              rolesAmbient,
              rolesLinked,
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('one subject per token');
          expect(error.message).toContain('mechanic::flow');
          expect(error.message).toMatchSnapshot();
        });
      },
    );

    when('[t7] +mechanic::flow atop a held ehmpathy/mechanic (Q1)', () => {
      then('the qualified entry narrows in place — one entry per role', () => {
        const result = computeBrainCliEnrollment({
          brain,
          spec: asIncremental(['mechanic::flow']),
          rolesAmbient: ['ehmpathy/mechanic', 'driver'],
          rolesLinked,
        });
        expect(result.roles).toEqual(['mechanic::flow', 'driver']);
      });
    });

    when('[t8] -mechanic atop a held ehmpathy/mechanic::flow (Q1)', () => {
      then('the qualified focused entry is removed whole', () => {
        const result = computeBrainCliEnrollment({
          brain,
          spec: new BrainCliEnrollmentSpec({
            mode: 'incremental',
            deltas: [new RoleDelta({ kind: 'subtraction', role: 'mechanic' })],
          }),
          rolesAmbient: ['ehmpathy/mechanic::flow', 'driver'],
          rolesLinked,
        });
        expect(result.roles).toEqual(['driver']);
      });
    });

    when('[t9] +mechanic::flow atop a held bhuild/driver', () => {
      then('a role of another name is kept as held', () => {
        const result = computeBrainCliEnrollment({
          brain,
          spec: asIncremental(['mechanic::flow']),
          rolesAmbient: ['bhuild/driver'],
          rolesLinked,
        });
        expect(result.roles).toEqual(['bhuild/driver', 'mechanic::flow']);
      });
    });
  });
});
