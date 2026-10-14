import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { genSampleCloneOndisk } from '@src/.test/assets/genSampleCloneOndisk';
import { getAllActorsOndisk } from '@src/domain.operations/actor/enrolled/getAllActorsOndisk';

import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { delStaleEnrollConfigs } from './delStaleEnrollConfigs';

const REPO_ACTOR_BRAIN_DIR_REL =
  '.agent/.actors/actor.via.repo=ambient/brain/.claude';

describe('delStaleEnrollConfigs', () => {
  given('[case1] an enroll config whose actor dir no longer exists', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = realpathSync(genTempDir({ slug: 'enroll-config-gone' }));
      const brainDir = join(repoPath, REPO_ACTOR_BRAIN_DIR_REL);
      mkdirSync(brainDir, { recursive: true });
      writeFileSync(
        join(brainDir, 'settings.enroll.abcd1234.local.json'),
        '{}',
      );
      writeFileSync(join(brainDir, 'permission.nudges.local.json'), '{}');
      const result = await delStaleEnrollConfigs({ repoPath });
      return { brainDir, result };
    });

    when('[t0] the stale configs are swept', () => {
      then('the enroll config is deleted', () => {
        expect(scene.result.deleted).toEqual([
          'settings.enroll.abcd1234.local.json',
        ]);
        expect(
          existsSync(
            join(scene.brainDir, 'settings.enroll.abcd1234.local.json'),
          ),
        ).toBe(false);
      });

      then('a local file of another name is left alone', () => {
        expect(
          existsSync(join(scene.brainDir, 'permission.nudges.local.json')),
        ).toBe(true);
      });
    });
  });

  given('[case2] an enroll config whose actor still has a DEAF clone', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = realpathSync(genTempDir({ slug: 'enroll-config-live' }));
      // DEAF: a socketless clone whose recorded pid is this live test process
      await genSampleCloneOndisk({
        repoPath,
        serial: getUuid(),
        slug: null,
        socketEligible: false,
      });
      const [actor] = getAllActorsOndisk({ repoPath });
      const name = `settings.enroll.${actor!.exid.replace('hash=', '')}.local.json`;
      const brainDir = join(repoPath, REPO_ACTOR_BRAIN_DIR_REL);
      mkdirSync(brainDir, { recursive: true });
      writeFileSync(join(brainDir, name), '{}');
      const result = await delStaleEnrollConfigs({ repoPath });
      return { brainDir, name, result };
    });

    when('[t0] the stale configs are swept', () => {
      then('the config is kept — a clone may still read it', () => {
        expect(scene.result.kept).toEqual([scene.name]);
        expect(existsSync(join(scene.brainDir, scene.name))).toBe(true);
      });
    });
  });
});
