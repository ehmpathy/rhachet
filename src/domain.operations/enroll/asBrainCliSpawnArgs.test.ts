import { given, then, when } from 'test-fns';

import { asBrainCliSpawnArgs } from './asBrainCliSpawnArgs';

/**
 * .what = locks the enroll spawn argv contract — the exact `--setting-sources
 *   user --settings <path> --system-prompt-file <boot>` flag ORDER, then the brain's
 *   passthrough
 * .why = the flag order is a contract with the brain cli; a reorder or a dropped
 *   flag silently breaks enrollment. DOGFOOD: drop `user`, re-add `local` or
 *   `project`, swap the two config flags, or drop the boot file, and the asserts below
 *   go red. `user` carries the grove; `local` and `project` would reach the repo
 *   actor's brain dir through the cwd (define.brain-dir-repo-vs-actor); the boot file
 *   is what lets a new session read the boot from the prompt cache
 */
describe('asBrainCliSpawnArgs', () => {
  given('[case1] a config path and a boot path, no passthrough', () => {
    const configPath = '/path/to/actor/brain/.claude/settings.of.repo.json';
    const bootMdPath = '/path/to/actor/brain/.claude/boot.md';

    when('[t0] the spawn args are built', () => {
      const args = asBrainCliSpawnArgs({
        configPath,
        bootMdPath,
        passthrough: [],
      });

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
          '--system-prompt-file',
          bootMdPath,
        ]);
      });

      then('the system prompt is the actor boot, by file', () => {
        const promptIndex = args.indexOf('--system-prompt-file');
        expect(promptIndex).toBeGreaterThan(-1);
        expect(args[promptIndex + 1]).toEqual(bootMdPath);
      });

      then('no inline system prompt rides beside the file', () => {
        expect(args).not.toContain('--system-prompt');
        expect(args).not.toContain('--append-system-prompt-file');
      });
    });
  });

  given('[case2] a config path and a boot path WITH passthrough', () => {
    const configPath = '/path/to/config.json';
    const bootMdPath = '/path/to/boot.md';

    when('[t0] passthrough args are provided', () => {
      const args = asBrainCliSpawnArgs({
        configPath,
        bootMdPath,
        passthrough: ['--resume', '--dangerously-skip-permissions'],
      });

      then('the passthrough comes AFTER the boot file', () => {
        expect(args).toEqual([
          '--setting-sources',
          'user',
          '--settings',
          configPath,
          '--system-prompt-file',
          bootMdPath,
          '--resume',
          '--dangerously-skip-permissions',
        ]);
      });
    });
  });
});
