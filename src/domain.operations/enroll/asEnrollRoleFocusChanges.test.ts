import { given, then, when } from 'test-fns';

import { BrainCliEnrollmentSpec } from '@src/domain.objects/BrainCliEnrollmentSpec';
import { RoleDelta } from '@src/domain.objects/RoleDelta';

import { asEnrollRoleFocusChanges } from './asEnrollRoleFocusChanges';

describe('asEnrollRoleFocusChanges', () => {
  given('[case1] a delta that narrows a held mechanic', () => {
    when('[t0] the changes are read against the ambient set', () => {
      then('it names the narrow', () => {
        expect(
          asEnrollRoleFocusChanges({
            spec: new BrainCliEnrollmentSpec({
              mode: 'incremental',
              deltas: [
                new RoleDelta({ kind: 'addition', role: 'mechanic::flow' }),
              ],
            }),
            rolesAmbient: ['mechanic', 'driver'],
            rolesAfter: ['mechanic::flow', 'driver'],
          }),
        ).toEqual([
          { role: 'mechanic', kind: 'narrow', from: null, to: ['flow'] },
        ]);
      });
    });
  });

  given('[case2] an exact set that names a focus', () => {
    when('[t0] the changes are read', () => {
      then('it names the focus as given — an exact set held naught', () => {
        expect(
          asEnrollRoleFocusChanges({
            spec: new BrainCliEnrollmentSpec({
              mode: 'absolute',
              deltas: [
                new RoleDelta({ kind: 'absolute', role: 'mechanic::flow' }),
              ],
            }),
            rolesAmbient: ['mechanic', 'driver'],
            rolesAfter: ['mechanic::flow'],
          }),
        ).toEqual([
          { role: 'mechanic', kind: 'given', from: null, to: ['flow'] },
        ]);
      });
    });
  });

  given(
    '[case3] a delta that leaves a recorded focus untouched (`-driver`)',
    () => {
      when('[t0] the changes are read against the ambient set', () => {
        then('it names the inherited focus as held — never silent', () => {
          expect(
            asEnrollRoleFocusChanges({
              spec: new BrainCliEnrollmentSpec({
                mode: 'incremental',
                deltas: [
                  new RoleDelta({ kind: 'subtraction', role: 'driver' }),
                ],
              }),
              rolesAmbient: ['mechanic::flow', 'driver'],
              rolesAfter: ['mechanic::flow'],
            }),
          ).toEqual([
            { role: 'mechanic', kind: 'held', from: ['flow'], to: ['flow'] },
          ]);
        });
      });

      when('[t1] the call re-types the held focus', () => {
        then('it names it unchanged, never twice', () => {
          expect(
            asEnrollRoleFocusChanges({
              spec: new BrainCliEnrollmentSpec({
                mode: 'incremental',
                deltas: [
                  new RoleDelta({ kind: 'addition', role: 'mechanic::flow' }),
                ],
              }),
              rolesAmbient: ['mechanic::flow'],
              rolesAfter: ['mechanic::flow'],
            }),
          ).toEqual([
            {
              role: 'mechanic',
              kind: 'unchanged',
              from: ['flow'],
              to: ['flow'],
            },
          ]);
        });
      });
    },
  );
});
