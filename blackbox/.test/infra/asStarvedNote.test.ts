import { given, then, when } from 'test-fns';

import { asStarvedNote } from './asStarvedNote';

describe('asStarvedNote', () => {
  given('[case1] a red run whose box was starved', () => {
    when('[t0] psi was measured', () => {
      then('it names the pressure and the load beside the box before the run, and the re-run', () => {
        const note = asStarvedNote({
          peak: { cpuPsiSomeAvg10: 80.7, load1: 55.7, cores: 12 },
          before: { cpuPsiSomeAvg10: 31.2, load1: 9.4, cores: 12 },
          filesTimedOut: ['blackbox/cli/enroll.acceptance.test.ts'],
        });
        expect(note).toContain('peak cpu pressure = 81% (cpu stall, 10s average), 31% before the run began');
        expect(note).toContain('peak load = 55.7 on 12 cores, 9.4 before the run began');
        expect(note).toContain('the red stays red');
        expect(note).toContain(
          "rhx test.acceptance.credfree --scope 'blackbox/cli/enroll\\.acceptance\\.test\\.ts' --maxWorkers 1",
        );
        expect(note).not.toContain('npx jest');
        expect(note).toMatchSnapshot();
      });
    });

    when('[t2] two files timed out', () => {
      then('the re-run scope names both, as alternatives of one path regex', () => {
        const note = asStarvedNote({
          peak: { cpuPsiSomeAvg10: 80.7, load1: 55.7, cores: 12 },
          before: { cpuPsiSomeAvg10: 31.2, load1: 9.4, cores: 12 },
          filesTimedOut: ['blackbox/cli/a.acceptance.test.ts', 'blackbox/cli/b.acceptance.test.ts'],
        });
        expect(note).toContain(
          "--scope 'blackbox/cli/a\\.acceptance\\.test\\.ts|blackbox/cli/b\\.acceptance\\.test\\.ts'",
        );
      });
    });

    when('[t1] psi was not measurable', () => {
      then('it says so rather than print a number', () => {
        const note = asStarvedNote({
          peak: { cpuPsiSomeAvg10: null, load1: 20, cores: 8 },
          before: { cpuPsiSomeAvg10: null, load1: 4, cores: 8 },
          filesTimedOut: ['a.acceptance.test.ts'],
        });
        expect(note).toContain('not measurable on this host');
        expect(note).toMatchSnapshot();
      });
    });
  });
});
