import { given, then, when } from 'test-fns';

import type * as childProcess from 'node:child_process';

// capture spawn calls for verification
const spawnCalls: Array<{
  command: string;
  args: string[];
  options: childProcess.SpawnOptions;
}> = [];

// mock spawn to capture calls without actual process creation
jest.mock('node:child_process', () => ({
  spawn: jest.fn((command: string, args: string[], options) => {
    spawnCalls.push({ command, args, options });
    // return a mock child process (no-op)
    return {
      on: jest.fn(),
    };
  }),
}));

// import after mock setup
import { enrollBrainCli } from './enrollBrainCli';

describe('enrollBrainCli', () => {
  beforeEach(() => {
    spawnCalls.length = 0;
  });

  given('[case1] brain spawn args', () => {
    when('[t0] enrollBrainCli is called', () => {
      then('spawn includes --setting-sources local flag', () => {
        enrollBrainCli({
          brain: 'claude',
          configPath: '/path/to/settings.enroll.abc123.local.json',
          args: [],
          cwd: '/test/cwd',
        });

        expect(spawnCalls).toHaveLength(1);
        const [call] = spawnCalls;
        expect(call!.args).toContain('--setting-sources');
        expect(call!.args).toContain('local');
      });

      then('spawn includes --settings with config path', () => {
        enrollBrainCli({
          brain: 'claude',
          configPath: '/path/to/settings.enroll.abc123.local.json',
          args: [],
          cwd: '/test/cwd',
        });

        const [call] = spawnCalls;
        expect(call!.args).toContain('--settings');
        const settingsIndex = call!.args.indexOf('--settings');
        expect(call!.args[settingsIndex + 1]).toEqual(
          '/path/to/settings.enroll.abc123.local.json',
        );
      });

      then('--setting-sources comes before --settings', () => {
        enrollBrainCli({
          brain: 'claude',
          configPath: '/path/to/settings.enroll.abc123.local.json',
          args: [],
          cwd: '/test/cwd',
        });

        const [call] = spawnCalls;
        const sourcesIndex = call!.args.indexOf('--setting-sources');
        const settingsIndex = call!.args.indexOf('--settings');
        expect(sourcesIndex).toBeLessThan(settingsIndex);
      });
    });

    when('[t1] passthrough args are provided', () => {
      then('passthrough args come after --settings <path>', () => {
        enrollBrainCli({
          brain: 'claude',
          configPath: '/path/to/config.json',
          args: ['--resume', '--dangerously-skip-permissions'],
          cwd: '/test/cwd',
        });

        const [call] = spawnCalls;
        // expected order: --setting-sources, local, --settings, <path>, --resume, --dangerously-skip-permissions
        expect(call!.args).toEqual([
          '--setting-sources',
          'local',
          '--settings',
          '/path/to/config.json',
          '--resume',
          '--dangerously-skip-permissions',
        ]);
      });
    });
  });
});
