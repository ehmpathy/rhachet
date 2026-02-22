import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet run graceful errors', () => {
  given('[case1] skill that exits 0 (success)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] npx rhachet run --skill say-hello', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'say-hello'],
          cwd: repo.path,
        }),
      );

      then('process exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains skill identifier', () => {
        expect(result.stdout).toContain('🪨 run solid skill');
      });

      then('no status subtree is shown', () => {
        expect(result.stdout).not.toContain('└─');
        expect(result.stderr).not.toContain('└─');
      });
    });
  });

  given('[case2] skill that exits 2 (graceful failure)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] npx rhachet run --skill graceful-fail', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'graceful-fail'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });

      then('process exits 2', () => {
        expect(result.status).toEqual(2);
      });

      then('stderr contains skill identifier', () => {
        expect(result.stderr).toContain('🪨 run solid skill');
      });

      then('stderr contains blocked status', () => {
        expect(result.stderr).toContain('✋ blocked by constraints');
      });

      then('stderr contains skill output', () => {
        expect(result.stderr).toContain('quota error');
      });

      then('skill identifier appears BEFORE status BEFORE skill output', () => {
        const headerIdx = result.stderr.indexOf('🪨 run solid skill');
        const statusIdx = result.stderr.indexOf('✋ blocked by constraints');
        const skillOutputIdx = result.stderr.indexOf('quota error');

        expect(headerIdx).toBeGreaterThan(-1);
        expect(statusIdx).toBeGreaterThan(-1);
        expect(skillOutputIdx).toBeGreaterThan(-1);
        expect(headerIdx).toBeLessThan(statusIdx);
        expect(statusIdx).toBeLessThan(skillOutputIdx);
      });

      then('stderr does NOT contain JSON', () => {
        expect(result.stderr).not.toContain('"skill":');
        expect(result.stderr).not.toContain('"exitCode":');
        expect(result.stderr).not.toContain('"path":');
      });
    });
  });

  given('[case3] skill that exits 1 (unexpected failure)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] npx rhachet run --skill unexpected-fail', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'unexpected-fail'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });

      then('process exits 1', () => {
        expect(result.status).toEqual(1);
      });

      then('stderr contains skill identifier', () => {
        expect(result.stderr).toContain('🪨 run solid skill');
      });

      then('stderr contains failed status', () => {
        expect(result.stderr).toContain('💥 failed with an error');
      });

      then('stderr contains skill output', () => {
        expect(result.stderr).toContain('jq: command not found');
      });

      then('skill identifier appears BEFORE status BEFORE skill output', () => {
        const headerIdx = result.stderr.indexOf('🪨 run solid skill');
        const statusIdx = result.stderr.indexOf('💥 failed with an error');
        const skillOutputIdx = result.stderr.indexOf('jq: command not found');

        expect(headerIdx).toBeGreaterThan(-1);
        expect(statusIdx).toBeGreaterThan(-1);
        expect(skillOutputIdx).toBeGreaterThan(-1);
        expect(headerIdx).toBeLessThan(statusIdx);
        expect(statusIdx).toBeLessThan(skillOutputIdx);
      });

      then('stderr does NOT contain JSON', () => {
        expect(result.stderr).not.toContain('"skill":');
        expect(result.stderr).not.toContain('"exitCode":');
        expect(result.stderr).not.toContain('"path":');
      });
    });
  });

  given('[case4] skill that exits with other codes (127)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] npx rhachet run --skill exit-code --code 127', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'exit-code', '--code', '127'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('process exits 127 (preserves original exit code)', () => {
        expect(result.status).toEqual(127);
      });

      then('stderr contains failed status (not blocked)', () => {
        expect(result.stderr).toContain('💥 failed with an error');
        expect(result.stderr).not.toContain('✋ blocked');
      });
    });
  });
});
