import { given, then, when } from 'test-fns';

import { spawnSync } from 'node:child_process';
import { getGlobalRhachetVersion } from './getGlobalRhachetVersion';

describe('getGlobalRhachetVersion (integration)', () => {
  given('[case1] real pnpm environment', () => {
    when('[t0] getGlobalRhachetVersion is called', () => {
      then('returns a version string or null', () => {
        // debug: raw command output
        const rawResult = spawnSync(
          'npm',
          ['list', '-g', 'rhachet', '--depth=0', '--json'],
          { stdio: 'pipe', shell: true },
        );
        console.log('raw status:', rawResult.status);
        console.log('raw stdout:', rawResult.stdout?.toString());
        console.log('raw stderr:', rawResult.stderr?.toString());

        const version = getGlobalRhachetVersion();
        console.log('getGlobalRhachetVersion() returned:', version);
        // should be either a version string like '1.39.11' or null
        expect(version === null || typeof version === 'string').toBe(true);
        // if rhachet is installed globally, expect a version
        if (version !== null) {
          expect(version).toMatch(/^\d+\.\d+\.\d+/);
        }
      });
    });
  });
});
