import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleRepoWithRoles } from '@src/.test/assets/genSampleRepoWithRoles';

import { execFileSync, spawnSync } from 'node:child_process';
import { lstatSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { setRepoActorBrainDir } from './setRepoActorBrainDir';

const GROVE_REL =
  '.agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.grove.json';

const ROLES = [{ repo: '.this', role: 'any' }];

/**
 * .what = run one git command in a repo, as a fixture identity
 */
const runGit = (input: { repo: string; args: string[] }): string =>
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Test Human',
      '-c',
      'user.email=human@example.com',
      ...input.args,
    ],
    { cwd: input.repo },
  ).toString();

/**
 * .what = point the grove link at one home, as that box's layout findsert would
 */
const setGroveLinkToHome = (input: { repo: string; home: string }): void => {
  const path = join(input.repo, GROVE_REL);
  rmSync(path, { force: true });
  symlinkSync(`${input.home}/.claude/settings.json`, path);
};

/**
 * .what = the journey of a teammate who pulls the commit that untracks the grove link
 * .why = their box has relinked the tracked link to their own home, so the pull meets a local
 *        change to a path upstream deletes. this pins what git does there, and the cure the
 *        pr body and fulcrum F5 name
 */
describe('setRepoActorBrainDir, a teammate pulls the untrack', () => {
  given(
    '[case1] an origin that tracks the grove link, and a teammate clone that relinked it',
    () => {
      const scene = useBeforeAll(async () => {
        // origin: a prior release tracked the grove link, which names camper's home
        const origin = genSampleRepoWithRoles({
          slug: 'teammate-pull-origin',
          roles: ROLES,
          gitignore: 'node_modules\n.agent/.actors/\n',
        });
        await setRepoActorBrainDir({ repoPath: origin, refsLinked: ROLES });
        setGroveLinkToHome({ repo: origin, home: '/home/camper' });
        runGit({ repo: origin, args: ['add', '--all'] });
        runGit({ repo: origin, args: ['add', '--force', '--', GROVE_REL] });
        runGit({
          repo: origin,
          args: ['commit', '--quiet', '--no-verify', '-m', 'seed'],
        });

        // the teammate clones, and their box relinks the grove to their own home
        const teammate = join(
          realpathSync(genTempDir({ slug: 'teammate-pull-clone' })),
          'repo',
        );
        execFileSync('git', ['clone', '--quiet', origin, teammate]);
        setGroveLinkToHome({ repo: teammate, home: '/home/teammate' });

        // a second teammate, the same, who will sync with the fix before they pull
        const teammateSynced = join(
          realpathSync(genTempDir({ slug: 'teammate-pull-clone-synced' })),
          'repo',
        );
        execFileSync('git', ['clone', '--quiet', origin, teammateSynced]);
        setGroveLinkToHome({ repo: teammateSynced, home: '/home/teammate' });

        // origin syncs with this fix, and commits the untrack
        const synced = await setRepoActorBrainDir({
          repoPath: origin,
          refsLinked: ROLES,
        });
        runGit({
          repo: origin,
          args: ['commit', '--quiet', '--no-verify', '-m', 'untrack grove'],
        });

        // the second teammate syncs with the fix first (it untracks the link on their box),
        //   then pulls
        await setRepoActorBrainDir({
          repoPath: teammateSynced,
          refsLinked: ROLES,
        });
        const pullAfterSync = spawnSync(
          'git',
          ['pull', '--ff-only', '--quiet'],
          { cwd: teammateSynced, env: { ...process.env, LC_ALL: 'C' } },
        );
        const statusAfterSyncPull = runGit({
          repo: teammateSynced,
          args: ['status', '--porcelain'],
        });

        // the teammate pulls, as is
        const pullFirst = spawnSync('git', ['pull', '--ff-only', '--quiet'], {
          cwd: teammate,
          env: { ...process.env, LC_ALL: 'C' },
        });

        // the cure: restore the tracked link, then pull
        runGit({ repo: teammate, args: ['checkout', '--', GROVE_REL] });
        const pullCured = spawnSync('git', ['pull', '--ff-only', '--quiet'], {
          cwd: teammate,
          env: { ...process.env, LC_ALL: 'C' },
        });
        const isLinkAfterCure = (() => {
          try {
            return lstatSync(join(teammate, GROVE_REL)).isSymbolicLink();
          } catch {
            return false;
          }
        })();

        // their next sync relinks the grove, now ignored
        await setRepoActorBrainDir({ repoPath: teammate, refsLinked: ROLES });
        const statusAfterSync = runGit({
          repo: teammate,
          args: ['status', '--porcelain'],
        });
        return {
          synced,
          pullFirst: {
            status: pullFirst.status,
            stderr: pullFirst.stderr.toString(),
          },
          pullCured: { status: pullCured.status },
          isLinkAfterCure,
          statusAfterSync,
          pullAfterSync: {
            status: pullAfterSync.status,
            stderr: pullAfterSync.stderr.toString(),
          },
          statusAfterSyncPull,
          teammate,
        };
      });

      when('[t0] origin syncs with the fix', () => {
        then('it names the grove link as untracked', () => {
          expect(scene.synced.untracked).toEqual([GROVE_REL]);
        });
      });

      when('[t1] the teammate pulls with their relinked grove', () => {
        then(
          'git refuses the pull, since it would overwrite a local change',
          () => {
            expect(scene.pullFirst.status).not.toEqual(0);
            expect(scene.pullFirst.stderr).toContain(GROVE_REL);
          },
        );
      });

      when('[t2] the teammate restores the link, then pulls', () => {
        then('the pull lands, and the link leaves their tree', () => {
          expect(scene.pullCured.status).toEqual(0);
          expect(scene.isLinkAfterCure).toEqual(false);
        });

        then('their next sync leaves git clean', () => {
          expect(scene.statusAfterSync).toEqual('');
        });
      });

      when('[t3] a teammate syncs with the fix, then pulls', () => {
        then('the pull lands, and git is clean after it', () => {
          expect(scene.pullAfterSync).toEqual({ status: 0, stderr: '' });
          expect(scene.statusAfterSyncPull).toEqual('');
        });
      });
    },
  );
});
