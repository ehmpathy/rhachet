import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { genTempDir, given, then, useThen, when } from 'test-fns';

import { getOneFocusReceiptBlock } from '@/blackbox/.test/infra/getOneFocusReceiptBlock';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import {
  getOneIsRoleLinked,
  setupRoleFixtureRepo,
} from '@/blackbox/.test/infra/roleFixtureRepo';

/**
 * .what = the path of the ambient role foci record, beside the repo actor
 */
const asFociPath = (input: { dir: string }): string =>
  join(input.dir, '.agent/.actors/actor.via.repo=ambient/roles.foci.json');

/**
 * .what = the repo actor's role settings, where the linked roles' hooks land
 */
const asRepoSettingsPath = (input: { dir: string }): string =>
  join(
    input.dir,
    '.agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.repo.json',
  );

/**
 * .what = declares the anthropic brain package in the fixture's package.json
 * .why = `init --hooks claude-code` needs the brain's adapter, which the fixture's
 *   linked node_modules holds but its package.json does not declare
 */
const setPackageBrainAnthropicDeclared = (input: { dir: string }): void => {
  const packagePath = join(input.dir, 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  writeFileSync(
    packagePath,
    JSON.stringify(
      {
        ...packageJson,
        dependencies: {
          ...packageJson.dependencies,
          'rhachet-brains-anthropic': '*',
        },
      },
      null,
      2,
    ),
  );
};

describe('rhx init --roles <role>::<subject> (acceptance)', () => {
  given('[case1] an empty repo, and a focus mechanic does not declare', () => {
    const testDir = genTempDir({ slug: 'init-focus-unknown' });
    beforeAll(() => setupRoleFixtureRepo({ dir: testDir }));

    when('[t0] `init --roles mechanic::nope`', () => {
      const run = useThen('it is refused', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'mechanic::nope'],
          cwd: testDir,
          logOnError: false,
        }),
      );

      then('it exits 2, a constraint the caller must fix', () => {
        expect(run.status).toEqual(2);
      });

      then('it names the focus and each subject mechanic declares', () => {
        expect(run.stderr).toContain("role 'mechanic' declares no subject 'nope'");
        expect(run.stderr).toContain('mechanic::flow');
        expect(run.stderr).toContain('mechanic::code.prod');
      });

      then('the repo is left as it was found — no link, no actor dir, no record', () => {
        expect(getOneIsRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(false);
        expect(existsSync(join(testDir, '.agent/.actors'))).toEqual(false);
        expect(existsSync(asFociPath({ dir: testDir }))).toEqual(false);
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] a repo whose ambient foci record is not json', () => {
    const testDir = genTempDir({ slug: 'init-focus-corrupt' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      mkdirSync(join(asFociPath({ dir: testDir }), '..'), { recursive: true });
      writeFileSync(asFociPath({ dir: testDir }), '{ mechanic: flow');
    });

    when('[t0] `init --roles +mechanic::flow`', () => {
      const run = useThen('it is refused', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+mechanic::flow'],
          cwd: testDir,
          logOnError: false,
        }),
      );

      then('it exits non-zero, and never overwrites the record it could not read', () => {
        expect(run.status).not.toEqual(0);
        expect(readFileSync(asFociPath({ dir: testDir }), 'utf8')).toEqual(
          '{ mechanic: flow',
        );
      });

      then('it names the record and the repair', () => {
        expect(run.stderr).toContain('roles.foci.json');
        expect(run.stderr).toContain('or remove it');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case2] an empty repo, and a focus mechanic declares', () => {
    const testDir = genTempDir({ slug: 'init-focus-flow' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      setPackageBrainAnthropicDeclared({ dir: testDir });
    });

    when('[t0] `init --roles mechanic::flow --hooks claude-code`', () => {
      // .note = the fixture holds no brain to detect, so the hook target is named
      const run = useThen('it succeeds', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'mechanic::flow', '--hooks', 'claude-code'],
          cwd: testDir,
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('stdout names the focus held, so a fresh focus is never silent', () => {
        expect(run.stdout).toContain('🧢 focus');
        expect(run.stdout).toContain('mechanic focused at ::flow');
      });

      then('the focus receipt renders as snapshotted', () => {
        expect(getOneFocusReceiptBlock({ output: run.stdout })).toMatchSnapshot();
      });

      then('the whole role is linked — a link carries no focus', () => {
        expect(getOneIsRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(true);
      });

      then('the ambient record holds the focus', () => {
        expect(
          JSON.parse(readFileSync(asFociPath({ dir: testDir }), 'utf8')),
        ).toEqual({ mechanic: ['flow'] });
      });

      then('the role keeps its hooks — hooks follow the role, never the focus', () => {
        expect(readFileSync(asRepoSettingsPath({ dir: testDir }), 'utf8')).toContain(
          'role=mechanic',
        );
      });
    });

    when('[t1] `init --roles +mechanic` widens it back', () => {
      const run = useThen('it succeeds', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+mechanic'],
          cwd: testDir,
        }),
      );

      then('the ambient record holds no focus', () => {
        expect(run.status).toEqual(0);
        expect(
          JSON.parse(readFileSync(asFociPath({ dir: testDir }), 'utf8')),
        ).toEqual({});
      });
    });
  });
});
