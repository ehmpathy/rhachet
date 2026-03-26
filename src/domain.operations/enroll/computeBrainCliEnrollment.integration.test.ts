import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { BrainCliEnrollmentOperation } from '@src/domain.objects/BrainCliEnrollmentOperation';
import { BrainCliEnrollmentSpec } from '@src/domain.objects/BrainCliEnrollmentSpec';

import { computeBrainCliEnrollment } from './computeBrainCliEnrollment';

describe('computeBrainCliEnrollment', () => {
  const rolesLinked = ['mechanic', 'driver', 'ergonomist', 'architect'];
  const rolesDefault = ['mechanic', 'driver', 'ergonomist'];
  const brain = 'claude';

  given('[case1] replace mode with single role', () => {
    when('[t0] spec replaces with mechanic', () => {
      then('returns manifest with only mechanic', () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'replace',
          ops: [
            new BrainCliEnrollmentOperation({
              action: 'add',
              role: 'mechanic',
            }),
          ],
        });
        const result = computeBrainCliEnrollment({
          brain,
          spec,
          rolesDefault,
          rolesLinked,
        });
        expect(result.brain).toEqual('claude');
        expect(result.roles).toEqual(['mechanic']);
      });
    });
  });

  given('[case2] replace mode with multiple roles', () => {
    when('[t0] spec replaces with mechanic and architect', () => {
      then('returns manifest with only those two', () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'replace',
          ops: [
            new BrainCliEnrollmentOperation({
              action: 'add',
              role: 'mechanic',
            }),
            new BrainCliEnrollmentOperation({
              action: 'add',
              role: 'architect',
            }),
          ],
        });
        const result = computeBrainCliEnrollment({
          brain,
          spec,
          rolesDefault,
          rolesLinked,
        });
        expect(result.roles).toEqual(['mechanic', 'architect']);
      });
    });
  });

  given('[case3] delta mode with append', () => {
    when('[t0] spec appends architect to defaults', () => {
      then('returns defaults plus architect', () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'delta',
          ops: [
            new BrainCliEnrollmentOperation({
              action: 'add',
              role: 'architect',
            }),
          ],
        });
        const result = computeBrainCliEnrollment({
          brain,
          spec,
          rolesDefault,
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

  given('[case4] delta mode with subtract', () => {
    when('[t0] spec subtracts driver from defaults', () => {
      then('returns defaults minus driver', () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'delta',
          ops: [
            new BrainCliEnrollmentOperation({
              action: 'remove',
              role: 'driver',
            }),
          ],
        });
        const result = computeBrainCliEnrollment({
          brain,
          spec,
          rolesDefault,
          rolesLinked,
        });
        expect(result.roles).toContain('mechanic');
        expect(result.roles).toContain('ergonomist');
        expect(result.roles).not.toContain('driver');
        expect(result.roles).toHaveLength(2);
      });
    });
  });

  given('[case5] delta mode with mixed ops', () => {
    when('[t0] spec removes driver and adds architect', () => {
      then('returns defaults minus driver plus architect', () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'delta',
          ops: [
            new BrainCliEnrollmentOperation({
              action: 'remove',
              role: 'driver',
            }),
            new BrainCliEnrollmentOperation({
              action: 'add',
              role: 'architect',
            }),
          ],
        });
        const result = computeBrainCliEnrollment({
          brain,
          spec,
          rolesDefault,
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
      then('throws BadRequestError with suggestion', async () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'replace',
          ops: [
            new BrainCliEnrollmentOperation({ action: 'add', role: 'mechnic' }),
          ],
        });
        const error = await getError(() =>
          computeBrainCliEnrollment({
            brain,
            spec,
            rolesDefault,
            rolesLinked,
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain("role 'mechnic' not found");
        expect(error.message).toContain("did you mean 'mechanic'?");
      });
    });

    when('[t1] spec has "drivr" instead of "driver"', () => {
      then('throws BadRequestError with suggestion', async () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'delta',
          ops: [
            new BrainCliEnrollmentOperation({
              action: 'remove',
              role: 'drivr',
            }),
          ],
        });
        const error = await getError(() =>
          computeBrainCliEnrollment({
            brain,
            spec,
            rolesDefault,
            rolesLinked,
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain("role 'drivr' not found");
        expect(error.message).toContain("did you mean 'driver'?");
      });
    });
  });

  given('[case7] unknown role with no close match', () => {
    when('[t0] spec has "xyzabc" which has no close match', () => {
      then('throws BadRequestError without suggestion', async () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'replace',
          ops: [
            new BrainCliEnrollmentOperation({ action: 'add', role: 'xyzabc' }),
          ],
        });
        const error = await getError(() =>
          computeBrainCliEnrollment({
            brain,
            spec,
            rolesDefault,
            rolesLinked,
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain("role 'xyzabc' not found");
        expect(error.message).not.toContain('did you mean');
      });
    });
  });

  given('[case8] idempotent subtract of absent role', () => {
    when('[t0] spec subtracts architect which is not in defaults', () => {
      then('returns defaults unchanged (no-op)', () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'delta',
          ops: [
            new BrainCliEnrollmentOperation({
              action: 'remove',
              role: 'architect',
            }),
          ],
        });
        const result = computeBrainCliEnrollment({
          brain,
          spec,
          rolesDefault,
          rolesLinked,
        });
        expect(result.roles).toEqual(rolesDefault);
      });
    });
  });

  given('[case9] idempotent append of present role', () => {
    when('[t0] spec appends mechanic which is already in defaults', () => {
      then('returns defaults unchanged (no-op)', () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'delta',
          ops: [
            new BrainCliEnrollmentOperation({
              action: 'add',
              role: 'mechanic',
            }),
          ],
        });
        const result = computeBrainCliEnrollment({
          brain,
          spec,
          rolesDefault,
          rolesLinked,
        });
        expect(result.roles).toEqual(rolesDefault);
      });
    });
  });

  given('[case10] replace mode ignores defaults', () => {
    when('[t0] spec replaces with architect only', () => {
      then('returns only architect, ignores all defaults', () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'replace',
          ops: [
            new BrainCliEnrollmentOperation({
              action: 'add',
              role: 'architect',
            }),
          ],
        });
        const result = computeBrainCliEnrollment({
          brain,
          spec,
          rolesDefault,
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
      then('throws BadRequestError for any role', async () => {
        const spec = new BrainCliEnrollmentSpec({
          mode: 'replace',
          ops: [
            new BrainCliEnrollmentOperation({
              action: 'add',
              role: 'mechanic',
            }),
          ],
        });
        const error = await getError(() =>
          computeBrainCliEnrollment({
            brain,
            spec,
            rolesDefault: [],
            rolesLinked: [],
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain("role 'mechanic' not found");
      });
    });
  });
});
