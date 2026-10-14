import { given, then, when } from 'test-fns';

import { asBrainCliSpawnArgs } from './asBrainCliSpawnArgs';

/**
 * .what = locks the enroll spawn argv contract — the exact `--setting-sources
 *   user --settings <path>` flag ORDER, then the brain's passthrough
 * .why = the flag order is a contract with the brain cli; a reorder or a dropped
 *   flag silently breaks enrollment. DOGFOOD: drop `user`, re-add `local` or
 *   `project`, or swap the two flags, and the asserts below go red. `user` carries
 *   the actor's boot corpus and the grove; `local` and `project` would reach the
 *   repo actor's brain dir through the cwd (define.brain-dir-repo-vs-actor)
 */
describe('asBrainCliSpawnArgs', () => {
  given('[case1] a config path with no passthrough', () => {
    const configPath = '/path/to/actor/brain/.claude/settings.of.repo.json';

    when('[t0] the spawn args are built', () => {
      const args = asBrainCliSpawnArgs({ configPath, passthrough: [] });

      then(
        'it includes the `--setting-sources user` flag, and only user',
        () => {
          const sourcesIndex = args.indexOf('--setting-sources');
          expect(args[sourcesIndex + 1]).toEqual('user');
        },
      );

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
          'user',
          '--settings',
          configPath,
          '--system-prompt',
          '',
        ]);
      });

      then(
        'the default system prompt is emptied, so rhachet owns the boot context',
        () => {
          const promptIndex = args.indexOf('--system-prompt');
          expect(promptIndex).toBeGreaterThan(-1);
          expect(args[promptIndex + 1]).toEqual('');
        },
      );
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
          'user',
          '--settings',
          configPath,
          '--system-prompt',
          '',
          '--resume',
          '--dangerously-skip-permissions',
        ]);
      });
    });
  });
});
