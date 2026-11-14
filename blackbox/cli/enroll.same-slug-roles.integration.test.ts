import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { getAllActorHashDirNames } from '@/blackbox/.test/infra/brainDirBootJourney';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { setupStubBrainPath } from '@/blackbox/.test/infra/setupStubBrainPath';

/**
 * .what = the cli, run in a HOME with no grove, so no brain dir arrow reaches the host
 */
const invoke = (
  input: Parameters<typeof invokeRhachetCliBinary>[0],
): ReturnType<typeof invokeRhachetCliBinary> =>
  invokeRhachetCliBinary({
    ...input,
    env: { HOME: genTempDir({ slug: 'enroll-same-slug-home' }), ...input.env },
  });

/**
 * .what = the boot.md of one hash actor dir
 */
const getActorBootMd = (input: { repo: string; hashDir: string }): Promise<string> =>
  fs.readFile(
    path.join(input.repo, '.agent', '.actors', input.hashDir, 'brain', '.claude', 'boot.md'),
    'utf-8',
  );

/**
 * .what = a native `.this` role beside the linked ones
 * .why = an enroll whose roleset equals the ambient set is a clone of the repo actor, never a
 *        hash actor; a second ambient role makes `--roles surfer` its own hash actor
 */
const putNativeRoleLifeguard = async (input: { repo: string }): Promise<void> => {
  const roleDir = path.join(input.repo, '.agent', 'repo=.this', 'role=lifeguard');
  await fs.mkdir(path.join(roleDir, 'briefs'), { recursive: true });
  await fs.writeFile(path.join(roleDir, 'readme.md'), '# lifeguard, native\n');
  await fs.writeFile(
    path.join(roleDir, 'boot.yml'),
    'always:\n  briefs:\n    say:\n      - briefs/rule.require.whistle.md\n',
  );
  await fs.writeFile(
    path.join(roleDir, 'briefs', 'rule.require.whistle.md'),
    'native: blow the whistle\n',
  );
};

/**
 * .what = a native `.this` role of the slug `surfer`, which a linked package also ships
 * .why = the rhachet architect shape: a `.this` role boots beside its same-slug package role
 */
const putNativeRoleSurfer = async (input: { repo: string }): Promise<void> => {
  const roleDir = path.join(input.repo, '.agent', 'repo=.this', 'role=surfer');
  await fs.mkdir(path.join(roleDir, 'briefs'), { recursive: true });
  await fs.writeFile(path.join(roleDir, 'readme.md'), '# surfer, native\n');
  await fs.writeFile(
    path.join(roleDir, 'boot.yml'),
    'always:\n  briefs:\n    say:\n      - briefs/rule.require.local-break.md\n',
  );
  await fs.writeFile(
    path.join(roleDir, 'briefs', 'rule.require.local-break.md'),
    'native: surf the local break\n',
  );
};

/**
 * .what = a cli result's stdout and stderr, with volatile bytes masked, for a snapshot
 */
const asEnrollOutputSafe = (input: {
  stdout: string;
  stderr: string;
}): { stdout: string; stderr: string } => ({
  stdout: asSnapshotSafe(input.stdout),
  stderr: asSnapshotSafe(input.stderr),
});

/**
 * .what = the proof of requirements case 10's two enroll clauses: a bare slug unions every
 *         repo's role of that slug, and a bare-slug actor's identity is unchanged by it
 */
describe('rhx enroll — two repos that ship one role slug', () => {
  given('[case1] alpha and beta each ship role surfer, both linked', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-same-slug-roles' });
      await putNativeRoleLifeguard({ repo: one.path });
      await invoke({
        args: ['init', '--roles', 'alpha/surfer', 'beta/surfer'],
        cwd: one.path,
      });
      return { path: one.path, stubPath: setupStubBrainPath({ dir: one.path }) };
    });

    when('[t0] a clone is enrolled with the bare slug `--roles surfer`', () => {
      const result = useBeforeAll(async () => {
        const enrolled = await invoke({
          args: ['enroll', 'claude', '--roles', 'surfer'],
          cwd: repo.path,
          env: { PATH: repo.stubPath },
        });
        const hashDirs = getAllActorHashDirNames({ dir: repo.path });
        const boot = hashDirs[0]
          ? await getActorBootMd({ repo: repo.path, hashDir: hashDirs[0] })
          : null;
        return { enrolled, hashDirs, boot };
      });

      then('it exits 0', () => {
        expect(result.enrolled.status).toEqual(0);
      });

      then('it renders one hash actor', () => {
        expect(result.hashDirs).toHaveLength(1);
      });

      then('the actor boot carries both repos of the slug; neither is dropped', () => {
        expect(result.boot).toContain('alpha: ride a longboard on small days');
        expect(result.boot).toContain('beta: ride a shortboard on big days');
      });

      then('the actor boot.md matches its snapshot', () => {
        expect(asSnapshotSafe(result.boot ?? '')).toMatchSnapshot();
      });

      then('the enroll output matches its snapshot', () => {
        expect(asEnrollOutputSafe(result.enrolled)).toMatchSnapshot();
      });
    });

    when('[t1] the same bare slug is enrolled again', () => {
      const result = useBeforeAll(async () => {
        const hashDirsBefore = getAllActorHashDirNames({ dir: repo.path });
        const enrolled = await invoke({
          args: ['enroll', 'claude', '--roles', 'surfer'],
          cwd: repo.path,
          env: { PATH: repo.stubPath },
        });
        const hashDirsAfter = getAllActorHashDirNames({ dir: repo.path });
        return { enrolled, hashDirsBefore, hashDirsAfter };
      });

      then('it exits 0', () => {
        expect(result.enrolled.status).toEqual(0);
      });

      then('the actor identity is unchanged: the re-enroll keeps the same actor dir', () => {
        expect(result.hashDirsAfter).toEqual(result.hashDirsBefore);
      });

      then('the enroll output matches its snapshot', () => {
        expect(asEnrollOutputSafe(result.enrolled)).toMatchSnapshot();
      });
    });

    when('[t2] a clone is enrolled with a repo/role pin `--roles alpha/surfer`', () => {
      const result = useBeforeAll(async () => {
        const hashDirsBefore = getAllActorHashDirNames({ dir: repo.path });
        const enrolled = await invoke({
          args: ['enroll', 'claude', '--roles', 'alpha/surfer'],
          cwd: repo.path,
          env: { PATH: repo.stubPath },
        });
        const hashDirNew = getAllActorHashDirNames({ dir: repo.path }).filter(
          (hashDir) => !hashDirsBefore.includes(hashDir),
        );
        return { enrolled, hashDirNew };
      });

      then('it exits 0', () => {
        expect(result.enrolled.status).toEqual(0);
      });

      then('a pinned roleset is a different actor from the bare slug', () => {
        expect(result.hashDirNew).toHaveLength(1);
      });

      then('the pinned actor boot carries the named repo alone', async () => {
        const boot = await getActorBootMd({ repo: repo.path, hashDir: result.hashDirNew[0]! });
        expect(boot).toContain('alpha: ride a longboard on small days');
        expect(boot).not.toContain('beta: ride a shortboard on big days');
      });

      then('the enroll output matches its snapshot', () => {
        expect(asEnrollOutputSafe(result.enrolled)).toMatchSnapshot();
      });
    });

    when('[t3] the bare slug is booted on the cli', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['roles', 'boot', '--role', 'surfer'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it is refused as ambiguous, exit 2, and names --repo', () => {
        expect(result.status).toEqual(2);
        expect(`${result.stdout}${result.stderr}`).toContain('--repo');
      });

      then('the refusal output matches its snapshot', () => {
        expect(asEnrollOutputSafe(result)).toMatchSnapshot();
      });
    });
  });

  given('[case2] a bare-slug actor enrolled while one repo ships the slug', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-same-slug-roles' });
      await putNativeRoleLifeguard({ repo: one.path });
      await invoke({ args: ['init', '--roles', 'alpha/surfer'], cwd: one.path });
      const stubPath = setupStubBrainPath({ dir: one.path });
      await invoke({
        args: ['enroll', 'claude', '--roles', 'surfer'],
        cwd: one.path,
        env: { PATH: stubPath },
      });
      return {
        path: one.path,
        stubPath,
        hashDirsBefore: getAllActorHashDirNames({ dir: one.path }),
      };
    });

    when('[t0] a second repo that ships the slug is linked, and the bare slug re-enrolled', () => {
      const result = useBeforeAll(async () => {
        await invoke({ args: ['init', '--roles', 'beta/surfer'], cwd: repo.path });
        const enrolled = await invoke({
          args: ['enroll', 'claude', '--roles', 'surfer'],
          cwd: repo.path,
          env: { PATH: repo.stubPath },
        });
        return { enrolled, hashDirsAfter: getAllActorHashDirNames({ dir: repo.path }) };
      });

      then('it exits 0', () => {
        expect(result.enrolled.status).toEqual(0);
      });

      then('the actor hash keys on the bare slug: no actor dir moves, none is added', () => {
        expect(repo.hashDirsBefore).toHaveLength(1);
        expect(result.hashDirsAfter).toEqual(repo.hashDirsBefore);
      });

      then('the same actor now boots both repos of the slug', async () => {
        const boot = await getActorBootMd({
          repo: repo.path,
          hashDir: repo.hashDirsBefore[0]!,
        });
        expect(boot).toContain('alpha: ride a longboard on small days');
        expect(boot).toContain('beta: ride a shortboard on big days');
        expect(asSnapshotSafe(boot)).toMatchSnapshot();
      });
    });
  });

  given('[case3] a .this role beside a linked package role of the same slug (the F11 shape)', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-same-slug-roles' });
      await putNativeRoleLifeguard({ repo: one.path });
      await putNativeRoleSurfer({ repo: one.path });
      await invoke({ args: ['init', '--roles', 'alpha/surfer'], cwd: one.path });
      return { path: one.path, stubPath: setupStubBrainPath({ dir: one.path }) };
    });

    when('[t0] a clone is enrolled with the bare slug `--roles surfer`', () => {
      const result = useBeforeAll(async () => {
        const enrolled = await invoke({
          args: ['enroll', 'claude', '--roles', 'surfer'],
          cwd: repo.path,
          env: { PATH: repo.stubPath },
        });
        const hashDirs = getAllActorHashDirNames({ dir: repo.path });
        const boot =
          hashDirs.length === 1
            ? await getActorBootMd({ repo: repo.path, hashDir: hashDirs[0]! })
            : '';
        return { enrolled, hashDirs, boot };
      });

      then('it exits 0, and renders one hash actor', () => {
        expect(result.enrolled.status).toEqual(0);
        expect(result.hashDirs).toHaveLength(1);
      });

      then('both roles boot: the .this role beside the package role, never in its place', () => {
        expect(result.boot).toContain('native: surf the local break');
        expect(result.boot).toContain('alpha: ride a longboard on small days');
      });

      then('each boots in its own section, under its own repo dir', () => {
        expect(result.boot).toContain('.agent/repo=.this/role=surfer/briefs/rule.require.local-break.md');
        expect(result.boot).toContain('.agent/repo=alpha/role=surfer/briefs/rule.require.longboard.md');
      });

      then('the actor boot matches its snapshot', () => {
        expect(asSnapshotSafe(result.boot)).toMatchSnapshot();
      });
    });

    when('[t1] each is booted on the cli by its repo', () => {
      const result = useBeforeAll(async () => ({
        native: await invoke({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'surfer'],
          cwd: repo.path,
        }),
        alpha: await invoke({
          args: ['roles', 'boot', '--repo', 'alpha', '--role', 'surfer'],
          cwd: repo.path,
        }),
      }));

      then('each boots apart, with only its own briefs', () => {
        expect(result.native.status).toEqual(0);
        expect(result.alpha.status).toEqual(0);
        expect(result.native.stdout).toContain('native: surf the local break');
        expect(result.native.stdout).not.toContain('alpha: ride a longboard');
        expect(result.alpha.stdout).toContain('alpha: ride a longboard');
        expect(result.alpha.stdout).not.toContain('native: surf the local break');
      });

      then('each cli boot matches its snapshot', () => {
        expect({
          native: asSnapshotSafe(result.native.stdout),
          alpha: asSnapshotSafe(result.alpha.stdout),
        }).toMatchSnapshot();
      });
    });
  });
});
