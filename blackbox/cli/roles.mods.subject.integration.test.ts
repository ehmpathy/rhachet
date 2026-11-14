import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { MalfunctionError } from 'helpful-errors';
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
    env: { HOME: genTempDir({ slug: 'roles-mods-subject-home' }), ...input.env },
  });

const ARGS_BOOT = ['roles', 'boot', '--repo', 'test', '--role', 'surfer'];

/**
 * .what = the one line of a boot output that names a brief: a `<brief.say path=…>` header, or a
 *         row of a `<briefs.ref base=…>` block
 * .note = zero or several such lines fails loud: each brief renders once
 */
const getOneLineOfBrief = (input: { output: string; brief: string }): string => {
  const lines = input.output
    .split('\n')
    .filter((line) => line.includes(input.brief));
  if (lines.length !== 1)
    throw new MalfunctionError('expected exactly one boot line for the brief', {
      brief: input.brief,
      lines,
    });
  return lines[0]!;
};

/**
 * .what = the proof that a mod of a subject-mode role boots as the flagship shape does:
 *         `always:` and a subject, a ref'd add, a shadow demoted from say to ref, a shadow of a
 *         brief the role's boot.yml never names, and a not'd skill
 */
describe('rhachet roles — a subject-mode role modded via .agent/repo=.mods', () => {
  given('[case1] a repo that mods a linked subject-mode package role', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods-subject' });
      const init = await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      if (init.status !== 0)
        throw new MalfunctionError('the subject-mode fixture could not init', {
          stdout: init.stdout,
          stderr: init.stderr,
        });
      return one;
    });

    when('[t0] the role is booted', () => {
      const result = useBeforeAll(async () => invoke({ args: ARGS_BOOT, cwd: repo.path }));

      then('the boot exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the notice names the mod and its counts', () => {
        expect(result.stdout).toContain('<mod of="test/surfer@1.0.0">');
        expect(result.stdout).toContain('2 shadow, 1 add, 1 not');
        expect(result.stdout).toContain('[-] not skills/fins.check.sh');
      });

      then('the ref add renders as a ref row, tagged add, with no body', () => {
        const line = getOneLineOfBrief({
          output: result.stdout,
          brief: 'rule.require.reef-etiquette.md',
        });
        expect(line).not.toContain('brief.say');
        expect(line).toContain('mod="add"');
        expect(result.stdout).not.toContain('modded: mind the reef');
      });

      then('the shadow the mod refs is demoted from say to a ref row, tagged shadow', () => {
        const line = getOneLineOfBrief({
          output: result.stdout,
          brief: 'rule.require.surf-wax.md',
        });
        expect(line).not.toContain('brief.say');
        expect(line).toContain('mod="shadow"');
        expect(result.stdout).not.toContain('published: wax the board');
        expect(result.stdout).not.toContain('modded: wax the board, then wax the rails');
      });

      then('the shadow of a brief the role never names is tagged where it lands', () => {
        const line = getOneLineOfBrief({
          output: result.stdout,
          brief: 'rule.prefer.dawn-patrol.md',
        });
        expect(line).toContain('mod="shadow"');
      });

      then('the subject brief and the role ref render as published, untagged', () => {
        expect(
          getOneLineOfBrief({
            output: result.stdout,
            brief: 'howto.paddle-out.md',
          }),
        ).not.toContain('mod=');
      });

      then('the boot matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] the not-ed skill is run', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['run', '--skill', 'fins.check'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it is not found: the not removed it from the view', () => {
        expect(result.status).toEqual(2);
        expect(`${result.stdout}${result.stderr}`).not.toContain('fins tight');
      });

      then("the refusal names the mod's not: as the cause", () => {
        expect(result.stderr).toContain('a mod in this repo nots it');
        expect(result.stderr).toContain('nots skills/fins.check.sh');
        expect(result.stderr).not.toContain('roles link');
      });

      then('the not-found stderr matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] a skill the mod leaves alone is run', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ['run', '--skill', 'wax.board'], cwd: repo.path }),
      );

      then('it runs as published', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('waxed');
      });

      then('the run stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case2] a clone enrolled at a subject of the modded role', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods-subject' });
      await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      return one;
    });

    when('[t0] `enroll claude --roles surfer::waves`', () => {
      const result = useBeforeAll(async () => {
        const stubPath = setupStubBrainPath({ dir: repo.path });
        return invoke({
          args: ['enroll', 'claude', '--roles', 'surfer::waves'],
          cwd: repo.path,
          env: { PATH: stubPath },
          logOnError: false,
        });
      });

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the actor boot carries the mod notice, the subject, and the tags', async () => {
        const hashDirs = getAllActorHashDirNames({ dir: repo.path });
        expect(hashDirs).toHaveLength(1);
        const boot = await fs.readFile(
          path.join(
            repo.path,
            '.agent',
            '.actors',
            hashDirs[0]!,
            'brain',
            '.claude',
            'boot.md',
          ),
          'utf-8',
        );
        expect(boot).toContain('<mod of="test/surfer@1.0.0">');
        expect(boot).toContain('<focus given="waves"');
        expect(boot).toContain('published: read the set before you paddle out');
        expect(boot).toContain('mod="add"');
        expect(boot).toContain('mod="shadow"');
        expect(asSnapshotSafe(boot)).toMatchSnapshot();
      });
    });
  });
});
