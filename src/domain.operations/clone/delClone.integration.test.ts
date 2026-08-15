import { genTempDir, given, then, useThen, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { genSampleCloneOndisk } from '@src/.test/assets/genSampleCloneOndisk';
import { getActorsIndexDir } from '@src/domain.operations/actor/enrolled/getActorsIndexDir';

import { existsSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { delClone } from './delClone';
import { getAllClonesForActor } from './getAllClonesForActor';
import { getCloneHistoryDir } from './getCloneHistoryDir';

describe('delClone.integration', () => {
  given('[case1] a named clone on disk with serial + slug indexes', () => {
    const scene = useThen('it is provisioned', () => {
      const repoPath = genTempDir({ slug: 'delClone-named' });
      const serial = getUuid();
      const on = genSampleCloneOndisk({
        repoPath,
        serial,
        slug: 'doomed',
      });
      const [clone] = getAllClonesForActor({
        actorDir: on.actorDir,
        actorsRoot: on.actorsRoot,
        repoPath: on.repoPath,
        actorHash: on.actorHash,
      });
      return { on, clone: clone! };
    });

    when('[t0] the clone is reaped', () => {
      then('its dir, serial index, and slug index are all gone', () => {
        const serialsDir = getActorsIndexDir({
          actorsRoot: scene.on.actorsRoot,
          index: 'serials',
        });
        const slugsDir = getActorsIndexDir({
          actorsRoot: scene.on.actorsRoot,
          index: 'slugs',
        });

        // pre-condition: all three artifacts exist
        expect(existsSync(scene.on.cloneDir)).toBe(true);
        expect(existsSync(join(serialsDir, scene.on.serial))).toBe(true);
        expect(existsSync(join(slugsDir, 'doomed'))).toBe(true);

        delClone({ clone: scene.clone, actorsRoot: scene.on.actorsRoot });

        expect(existsSync(scene.on.cloneDir)).toBe(false);
        expect(existsSync(join(serialsDir, scene.on.serial))).toBe(false);
        expect(existsSync(join(slugsDir, 'doomed'))).toBe(false);
      });

      then('a second reap is an idempotent no-op (never throws)', () => {
        expect(() =>
          delClone({ clone: scene.clone, actorsRoot: scene.on.actorsRoot }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] a clone whose history holds a linked exid claim', () => {
    const scene = useThen('it is provisioned with an exid claim', () => {
      const repoPath = genTempDir({ slug: 'delClone-exid' });
      const serial = getUuid();
      const on = genSampleCloneOndisk({ repoPath, serial, slug: null });

      // provision one transcript + its history link + its `.exids/` claim, the way
      // genCloneHistoryLink would — so delClone has an exid claim to free
      const exid = getUuid();
      const transcriptPath = join(repoPath, `${exid}.jsonl`);
      writeFileSync(transcriptPath, '{}\n', 'utf8');

      const historyDir = getCloneHistoryDir({ cloneDir: on.cloneDir });
      mkdirSync(historyDir, { recursive: true });
      symlinkSync(transcriptPath, join(historyDir, `${exid}.jsonl`));

      const exidsDir = getActorsIndexDir({
        actorsRoot: on.actorsRoot,
        index: 'exids',
      });
      mkdirSync(exidsDir, { recursive: true });
      symlinkSync(transcriptPath, join(exidsDir, exid));

      const [clone] = getAllClonesForActor({
        actorDir: on.actorDir,
        actorsRoot: on.actorsRoot,
        repoPath: on.repoPath,
        actorHash: on.actorHash,
      });
      return { on, clone: clone!, exid, exidsDir };
    });

    when('[t0] the clone is reaped', () => {
      then(
        'its `.exids/` claim is freed so a future enroll may re-link',
        () => {
          expect(existsSync(join(scene.exidsDir, scene.exid))).toBe(true);

          delClone({ clone: scene.clone, actorsRoot: scene.on.actorsRoot });

          expect(existsSync(join(scene.exidsDir, scene.exid))).toBe(false);
          expect(existsSync(scene.on.cloneDir)).toBe(false);
        },
      );
    });
  });
});
