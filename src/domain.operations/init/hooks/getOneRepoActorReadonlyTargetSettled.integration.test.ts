import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { chmodSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneRepoActorReadonlyTargetSettled } from './getOneRepoActorReadonlyTargetSettled';

const REPO_ACTOR_DIR_REL = '.agent/.actors/actor.via.repo=ambient';

describe('getOneRepoActorReadonlyTargetSettled', () => {
  given(
    '[case1] the repo actor arrow lands at a 0444 file outside the repo',
    () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genTempDir({ slug: 'repo-actor-probe-readonly' });
        const home = genTempDir({ slug: 'repo-actor-probe-readonly-home' });
        const homeSettings = join(home, 'settings.json');
        writeFileSync(homeSettings, '{}\n');
        chmodSync(homeSettings, 0o444);
        const brainDir = join(repoPath, REPO_ACTOR_DIR_REL, 'brain', '.claude');
        mkdirSync(brainDir, { recursive: true });
        symlinkSync(homeSettings, join(brainDir, 'settings.json'));
        return {
          result: getOneRepoActorReadonlyTargetSettled({
            repoPath,
            isSkipped: false,
          }),
        };
      });

      when('[t0] the repo actor is probed', () => {
        then('it yields the target and no fault', () => {
          expect(scene.result.fault).toBeNull();
          expect(scene.result.target?.path).toContain(
            `${REPO_ACTOR_DIR_REL}/brain/.claude/settings.json`,
          );
        });
      });
    },
  );

  given('[case2] the repo actor brain dir parent is unreadable', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'repo-actor-probe-unreadable' });
      const brainParent = join(repoPath, REPO_ACTOR_DIR_REL, 'brain');
      mkdirSync(join(brainParent, '.claude'), { recursive: true });
      chmodSync(brainParent, 0o000);
      const result = getOneRepoActorReadonlyTargetSettled({
        repoPath,
        isSkipped: false,
      });
      // restore access, so the temp dir can be cleaned
      chmodSync(brainParent, 0o755);
      return { result };
    });

    when('[t0] the repo actor is probed', () => {
      then('it settles the denial as a ConstraintError, never a throw', () => {
        expect(scene.result.target).toBeNull();
        expect(scene.result.fault).toBeInstanceOf(ConstraintError);
        expect(scene.result.fault?.message).toContain(
          'repo actor settings could not be read (EACCES)',
        );
      });
    });
  });

  given('[case3] the repo actor was skipped as outside the repo', () => {
    const scene = useBeforeAll(async () => ({
      result: getOneRepoActorReadonlyTargetSettled({
        repoPath: genTempDir({ slug: 'repo-actor-probe-skipped' }),
        isSkipped: true,
      }),
    }));

    when('[t0] the repo actor is probed', () => {
      then('it yields neither a target nor a fault', () => {
        expect(scene.result).toEqual({ target: null, fault: null });
      });
    });
  });
});
