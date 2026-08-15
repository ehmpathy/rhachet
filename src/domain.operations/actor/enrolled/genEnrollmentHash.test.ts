import { given, then, when } from 'test-fns';

import { genEnrollmentHash } from './genEnrollmentHash';

describe('genEnrollmentHash', () => {
  given('[case1] a brain + roleset', () => {
    when('[t0] hashed', () => {
      const hash = genEnrollmentHash({ brain: 'claude', roles: ['mechanic'] });

      then('it is an 8-char hex digest', () => {
        expect(hash).toMatch(/^[0-9a-f]{8}$/);
      });

      then('it is deterministic — same input, same hash', () => {
        expect(
          genEnrollmentHash({ brain: 'claude', roles: ['mechanic'] }),
        ).toEqual(hash);
      });
    });
  });

  given('[case2] the same roles in a different order', () => {
    when('[t0] each order is hashed', () => {
      const ab = genEnrollmentHash({
        brain: 'claude',
        roles: ['mechanic', 'driver'],
      });
      const ba = genEnrollmentHash({
        brain: 'claude',
        roles: ['driver', 'mechanic'],
      });

      then('role ORDER never forks the identity — one hash', () => {
        expect(ab).toEqual(ba);
      });
    });
  });

  given('[case3] a caller roles array', () => {
    when('[t0] hashed', () => {
      const roles = ['mechanic', 'driver'];
      genEnrollmentHash({ brain: 'claude', roles });

      then('the caller array is never mutated (sort is on a copy)', () => {
        expect(roles).toEqual(['mechanic', 'driver']);
      });
    });
  });

  given('[case4] a different brain or roleset', () => {
    when('[t0] each variant is hashed', () => {
      const base = genEnrollmentHash({ brain: 'claude', roles: ['mechanic'] });
      const otherBrain = genEnrollmentHash({
        brain: 'codex',
        roles: ['mechanic'],
      });
      const otherRoles = genEnrollmentHash({
        brain: 'claude',
        roles: ['driver'],
      });

      then('a different brain hashes distinctly', () => {
        expect(otherBrain).not.toEqual(base);
      });

      then('a different roleset hashes distinctly', () => {
        expect(otherRoles).not.toEqual(base);
      });
    });
  });
});
