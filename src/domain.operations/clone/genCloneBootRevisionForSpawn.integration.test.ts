import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { asBootContentHash } from '../boot/asBootContentHash';
import { genCloneBootRevisionForSpawn } from './genCloneBootRevisionForSpawn';

const BOOT_V1 = [
  '<brief.say path=".agent/repo=.this/role=any/briefs/surf.md">',
  'paddle out at dawn',
  '</brief.say>',
  '',
].join('\n');

/**
 * .what = an actor dir, with or without a rendered boot, and a staged clone dir
 */
const genActorScene = (input: { withBoot: boolean }) => {
  const actorDir = join(
    genTempDir({ slug: 'clone-boot-spawn' }),
    '.agent',
    '.actors',
    'actor.via.hash=abc12345',
  );
  const brainDir = getBrainOndiskDir({ actorDir });
  mkdirSync(brainDir, { recursive: true });
  if (input.withBoot) writeFileSync(join(brainDir, 'boot.md'), BOOT_V1);
  const stagedCloneDir = join(actorDir, 'clones', '.serial=aaaa.tmp');
  mkdirSync(stagedCloneDir, { recursive: true });
  return { actorDir, brainDir, stagedCloneDir };
};

describe('genCloneBootRevisionForSpawn', () => {
  given('[case1] an argv that names the boot, on an actor with a boot', () => {
    when('[t0] the spawn findserts its revision', () => {
      const scene = useBeforeAll(async () => {
        const actor = genActorScene({ withBoot: true });
        const result = genCloneBootRevisionForSpawn({
          actorDir: actor.actorDir,
          stagedCloneDir: actor.stagedCloneDir,
          args: [
            '--settings',
            'cfg.json',
            '--system-prompt-file',
            join(actor.brainDir, 'boot.md'),
          ],
        });
        return { ...actor, result };
      });

      then('the argv points at the revision boot by content hash', () => {
        const hash = asBootContentHash({ bytes: BOOT_V1 });
        const joined = scene.result.args.join(' ');
        expect(joined).toContain(
          `--add-dir ${scene.actorDir}/boots/sha256=${hash}`,
        );
        expect(joined).toContain(
          `--system-prompt-file ${scene.actorDir}/boots/sha256=${hash}/boot.md`,
        );
      });

      then('the staged clone dir records the revision hash', () => {
        expect(
          readFileSync(
            join(scene.stagedCloneDir, 'boot.spawned.ref'),
            'utf8',
          ).trim(),
        ).toEqual(asBootContentHash({ bytes: BOOT_V1 }));
      });
    });
  });

  given('[case2] an argv that names no boot', () => {
    when('[t0] the spawn is asked for its revision', () => {
      then('the argv passes through and no ref is written', () => {
        const actor = genActorScene({ withBoot: true });
        const args = ['--settings', 'cfg.json'];
        const result = genCloneBootRevisionForSpawn({
          actorDir: actor.actorDir,
          stagedCloneDir: actor.stagedCloneDir,
          args,
        });
        expect(result.args).toEqual(args);
        expect(existsSync(join(actor.stagedCloneDir, 'boot.spawned.ref'))).toBe(
          false,
        );
      });
    });
  });

  given('[case3] an actor with no rendered boot', () => {
    when('[t0] the spawn is asked for its revision', () => {
      then('the argv passes through and no ref is written', () => {
        const actor = genActorScene({ withBoot: false });
        const args = ['--system-prompt-file', join(actor.brainDir, 'boot.md')];
        const result = genCloneBootRevisionForSpawn({
          actorDir: actor.actorDir,
          stagedCloneDir: actor.stagedCloneDir,
          args,
        });
        expect(result.args).toEqual(args);
        expect(existsSync(join(actor.stagedCloneDir, 'boot.spawned.ref'))).toBe(
          false,
        );
      });
    });
  });

  given('[case3b] an argv that resumes a prior session', () => {
    when('[t0] the spawn is asked for its revision', () => {
      then(
        'no ref is written, only the resumed marker, and the argv passes through',
        () => {
          const actor = genActorScene({ withBoot: true });
          const args = [
            '--system-prompt-file',
            join(actor.brainDir, 'boot.md'),
            '--resume',
            'a1b2c3',
          ];
          const result = genCloneBootRevisionForSpawn({
            actorDir: actor.actorDir,
            stagedCloneDir: actor.stagedCloneDir,
            args,
          });
          expect(result.args).toEqual(args);
          expect(
            existsSync(join(actor.stagedCloneDir, 'boot.spawned.ref')),
          ).toBe(false);
          expect(
            existsSync(join(actor.stagedCloneDir, 'boot.spawned.resumed')),
          ).toBe(true);
        },
      );
    });
  });

  given('[case4] a ref that cannot be written', () => {
    when('[t0] the spawn findserts its revision', () => {
      then('it fails loud and reaps the staged dir', async () => {
        const actor = genActorScene({ withBoot: true });
        mkdirSync(join(actor.stagedCloneDir, 'boot.spawned.ref'));
        const error = await getError(() =>
          genCloneBootRevisionForSpawn({
            actorDir: actor.actorDir,
            stagedCloneDir: actor.stagedCloneDir,
            args: ['--system-prompt-file', join(actor.brainDir, 'boot.md')],
          }),
        );
        expect(error.message).toContain('boot.spawned.ref');
        expect(existsSync(actor.stagedCloneDir)).toBe(false);
      });
    });
  });
});
