import { given, then, when } from 'test-fns';

import { asBrainCliSpawnArgs } from './asBrainCliSpawnArgs';
import { asBrainCliSpawnArgsWithBootSpawned } from './asBrainCliSpawnArgsWithBootSpawned';

const BOOT_SPAWNED_DIR =
  '/repo/.agent/.actors/a/boots/serial=7c1e0b8a-3f2d-4a51-9e6b-2d8f0c4a1b3e';
const CONFIG_PATH =
  '/repo/.agent/.actors/a/brain/.claude/settings.of.repo.json';

describe('asBrainCliSpawnArgsWithBootSpawned', () => {
  given('[case1] an enroll argv with a passthrough prompt', () => {
    const args = asBrainCliSpawnArgs({
      configPath: CONFIG_PATH,
      bootMdPath: '/repo/.agent/.actors/a/brain/.claude/boot.md',
      passthrough: ['--model', 'haiku', 'hello'],
    });

    when('[t0] it is pointed at the clone spawn boot', () => {
      then(
        'the add-dir sits before the boot flag, and the boot flag reads the spawn boot',
        () => {
          expect(
            asBrainCliSpawnArgsWithBootSpawned({
              args,
              bootSpawnedDir: BOOT_SPAWNED_DIR,
              bootSpawnedMdPath: `${BOOT_SPAWNED_DIR}/boot.md`,
            }),
          ).toEqual([
            ...args.slice(0, 4),
            '--add-dir',
            BOOT_SPAWNED_DIR,
            '--system-prompt-file',
            `${BOOT_SPAWNED_DIR}/boot.md`,
            '--model',
            'haiku',
            'hello',
          ]);
          expect(args.slice(2, 4)).toEqual(['--settings', CONFIG_PATH]);
        },
      );
    });
  });

  given('[case2] an argv with no boot flag', () => {
    when('[t0] it is pointed at the clone spawn boot', () => {
      then('it is returned as is', () => {
        const args = ['--model', 'haiku'];
        expect(
          asBrainCliSpawnArgsWithBootSpawned({
            args,
            bootSpawnedDir: BOOT_SPAWNED_DIR,
            bootSpawnedMdPath: `${BOOT_SPAWNED_DIR}/boot.md`,
          }),
        ).toEqual(args);
      });
    });
  });
});
