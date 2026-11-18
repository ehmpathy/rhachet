import { given, then, when } from 'test-fns';

import { asBrainCliSpawnArgs } from './asBrainCliSpawnArgs';
import { asBrainCliSpawnArgsWithBootRevision } from './asBrainCliSpawnArgsWithBootRevision';

const REVISION_DIR = '/repo/.agent/.actors/a/boots/sha256=0123456789abcdef';
const CONFIG_PATH =
  '/repo/.agent/.actors/a/brain/.claude/settings.of.repo.json';

describe('asBrainCliSpawnArgsWithBootRevision', () => {
  given('[case1] an enroll argv with a passthrough prompt', () => {
    const args = asBrainCliSpawnArgs({
      configPath: CONFIG_PATH,
      bootMdPath: '/repo/.agent/.actors/a/brain/.claude/boot.md',
      passthrough: ['--model', 'haiku', 'hello'],
    });

    when('[t0] it is pointed at a boot revision', () => {
      then(
        'the add-dir sits before the boot flag, and the boot flag reads the revision boot',
        () => {
          expect(
            asBrainCliSpawnArgsWithBootRevision({
              args,
              revisionDir: REVISION_DIR,
              revisionBootMdPath: `${REVISION_DIR}/boot.md`,
            }),
          ).toEqual([
            ...args.slice(0, 4),
            '--add-dir',
            REVISION_DIR,
            '--system-prompt-file',
            `${REVISION_DIR}/boot.md`,
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
    when('[t0] it is pointed at a boot revision', () => {
      then('it is returned as is', () => {
        const args = ['--model', 'haiku'];
        expect(
          asBrainCliSpawnArgsWithBootRevision({
            args,
            revisionDir: REVISION_DIR,
            revisionBootMdPath: `${REVISION_DIR}/boot.md`,
          }),
        ).toEqual(args);
      });
    });
  });
});
