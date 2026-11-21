import { given, then, when } from 'test-fns';

import { existsSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { getOneBoxPressureNow } from './getOneBoxPressureNow';

describe('getOneBoxPressureNow', () => {
  given('[case1] the box this test runs on', () => {
    when('[t0] its pressure is read', () => {
      const pressure = getOneBoxPressureNow();

      then('the cores are the cores node sees', () => {
        expect(pressure.cores).toEqual(availableParallelism());
      });

      then('the load is a real number, never negative', () => {
        expect(Number.isFinite(pressure.load1)).toBe(true);
        expect(pressure.load1).toBeGreaterThanOrEqual(0);
      });

      then('psi is a percent where the kernel has it, and null where it has none', () => {
        if (!existsSync('/proc/pressure/cpu')) {
          expect(pressure.cpuPsiSomeAvg10).toBeNull();
          return;
        }
        expect(pressure.cpuPsiSomeAvg10).toBeGreaterThanOrEqual(0);
        expect(pressure.cpuPsiSomeAvg10).toBeLessThanOrEqual(100);
      });
    });
  });
});
