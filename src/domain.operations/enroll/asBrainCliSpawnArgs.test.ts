import { given, then, when } from 'test-fns';

import { asBrainCliSpawnArgs } from './asBrainCliSpawnArgs';

/**
 * .what = locks the enroll spawn argv contract — the exact `--setting-sources
 *   local --settings <path>` flag ORDER, then the brain's passthrough
 * .why = the flag order is a contract with the brain cli; a reorder or a dropped
 *   flag silently breaks enrollment. this restores the coverage the deleted
 *   enrollBrainCli.test.ts held once its array-build moved into a named
 *   transformer (rule.require.clamp-edge-cases: a previously-locked failure mode
 *   regains its guard). DOGFOOD: drop `local`, or swap the two flags, and the
 *   order asserts below go red
 */
describe('asBrainCliSpawnArgs', () => {
  given('[case1] a config path with no passthrough', () => {
    const configPath = '/path/to/settings.enroll.abc123.local.json';

    when('[t0] the spawn args are built', () => {
      const args = asBrainCliSpawnArgs({ configPath, passthrough: [] });

      then('it includes the `--setting-sources local` flag', () => {
        expect(args).toContain('--setting-sources');
        expect(args).toContain('local');
      });

      then('it includes `--settings` with the config path right after', () => {
        expect(args).toContain('--settings');
        const settingsIndex = args.indexOf('--settings');
        expect(args[settingsIndex + 1]).toEqual(configPath);
      });

      then('`--setting-sources` comes before `--settings`', () => {
        const sourcesIndex = args.indexOf('--setting-sources');
        const settingsIndex = args.indexOf('--settings');
        expect(sourcesIndex).toBeLessThan(settingsIndex);
      });

      then('the exact prefix order is locked', () => {
        expect(args).toEqual([
          '--setting-sources',
          'local',
          '--settings',
          configPath,
        ]);
      });
    });
  });

  given('[case2] a config path WITH passthrough', () => {
    const configPath = '/path/to/config.json';

    when('[t0] passthrough args are provided', () => {
      const args = asBrainCliSpawnArgs({
        configPath,
        passthrough: ['--resume', '--dangerously-skip-permissions'],
      });

      then('the passthrough comes AFTER `--settings <path>`', () => {
        expect(args).toEqual([
          '--setting-sources',
          'local',
          '--settings',
          configPath,
          '--resume',
          '--dangerously-skip-permissions',
        ]);
      });
    });
  });
});
