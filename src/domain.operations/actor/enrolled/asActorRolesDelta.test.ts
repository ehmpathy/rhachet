import { given, then, when } from 'test-fns';

import { BrainCliEnrollmentSpec } from '@src/domain.objects/BrainCliEnrollmentSpec';
import { RoleDelta } from '@src/domain.objects/RoleDelta';

import { asActorRolesDelta } from './asActorRolesDelta';

describe('asActorRolesDelta', () => {
  given('[case1] an incremental spec', () => {
    when('[t0] the deltas are `+architect -driver`', () => {
      then('the delta is the sorted sigiled tokens', () => {
        expect(
          asActorRolesDelta({
            spec: new BrainCliEnrollmentSpec({
              mode: 'incremental',
              deltas: [
                new RoleDelta({ kind: 'subtraction', role: 'driver' }),
                new RoleDelta({ kind: 'addition', role: 'architect' }),
              ],
            }),
          }),
        ).toEqual(['+architect', '-driver']);
      });
    });

    when('[t1] there are no deltas (a bare enroll)', () => {
      then('there is no delta', () => {
        expect(
          asActorRolesDelta({
            spec: new BrainCliEnrollmentSpec({
              mode: 'incremental',
              deltas: [],
            }),
          }),
        ).toEqual(null);
      });
    });
  });

  given('[case2] an absolute spec', () => {
    when('[t0] the spec is `mechanic`', () => {
      then('there is no delta — it names its whole roleset', () => {
        expect(
          asActorRolesDelta({
            spec: new BrainCliEnrollmentSpec({
              mode: 'absolute',
              deltas: [new RoleDelta({ kind: 'absolute', role: 'mechanic' })],
            }),
          }),
        ).toEqual(null);
      });
    });
  });
});
