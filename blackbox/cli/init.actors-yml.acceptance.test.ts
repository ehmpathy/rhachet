import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { genTempDir, given, then, useThen, when } from 'test-fns';

import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import {
  getOneIsRoleLinked,
  setupRoleFixtureRepo,
} from '@/blackbox/.test/infra/roleFixtureRepo';

/**
 * .what = write `.agent/actors.yml` into a fixture repo
 */
const setActorsYml = (input: { dir: string; lines: string[] }): void => {
  mkdirSync(join(input.dir, '.agent'), { recursive: true });
  writeFileSync(join(input.dir, '.agent', 'actors.yml'), input.lines.join('\n'));
};

/**
 * .what = slice the `🎭 actors.yml` report block out of `init` stdout
 * .why = the report is the subject; the link trees after it belong to the extant init surface
 *        and carry host-varied counts this case has no stake in
 */
const asActorsReportBlock = (input: { stdout: string }): string => {
  const lines = input.stdout.split('\n');
  const start = lines.findIndex((line) => line.startsWith('🎭 actors.yml'));
  if (start === -1) return input.stdout;
  const end = lines.findIndex((line, index) => index > start && line === '');
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
};

const ACTORS_YML_CREW = [
  "ambient: '@crew'",
  'actor:',
  '  - slug: crew',
  '    brain: claude',
  '    roles: [ehmpathy/mechanic, bhuild/behaver]',
  '  - slug: reader',
  '    roles:',
  "      - '@crew'",
  '      - -behaver',
  '      - +bhrain/librarian',
  '',
];

describe('rhx init under .agent/actors.yml (acceptance)', () => {
  given('[case1] a manifest with a repo actor and a peer extension', () => {
    const testDir = genTempDir({ slug: 'init-actors-yml' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      setActorsYml({ dir: testDir, lines: ACTORS_YML_CREW });
    });

    when('[t0] `init` with no --roles', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({ args: ['init'], cwd: testDir }),
      );

      then('the union of every actor roles is linked (F6)', () => {
        expect(run.status).toEqual(0);
        expect(getOneIsRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(true);
        expect(getOneIsRoleLinked({ dir: testDir, role: 'behaver' })).toEqual(true);
        expect(getOneIsRoleLinked({ dir: testDir, role: 'librarian' })).toEqual(true);
      });
      then('the report names the repo actor and the restored roles', () => {
        const block = asActorsReportBlock({ stdout: run.stdout });
        expect(block).toContain('repo actor = @crew');
        expect(block).toContain('2 actor(s), 3 role(s) declared');
        expect(block).toContain('short → restored');
        expect(block).toContain('bhrain/librarian ↺ linked');
      });
      then('the report block holds its shape', () => {
        expect(asActorsReportBlock({ stdout: run.stdout })).toMatchSnapshot();
      });
      then('`<repo>/.claude` points at the `ambient:` actor, `actor.via.slug=crew`', () => {
        expect(realpathSync(join(testDir, '.claude'))).toEqual(
          realpathSync(join(testDir, '.agent', '.actors', 'actor.via.slug=crew', 'brain', '.claude')),
        );
        expect(existsSync(join(testDir, '.agent', '.actors', 'actor.via.repo=ambient'))).toEqual(
          false,
        );
      });
      then('the repo actor boots `@crew` roles alone, never the whole union', () => {
        const bootMd = readFileSync(
          join(testDir, '.agent', '.actors', 'actor.via.slug=crew', 'brain', '.claude', 'boot.md'),
          'utf8',
        );
        expect(bootMd).toContain('role=mechanic');
        expect(bootMd).toContain('role=behaver');
        expect(bootMd).not.toContain('role=librarian');
      });
    });

    when('[t1] `init` again, no change', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({ args: ['init'], cwd: testDir }),
      );

      then('the report says the set is in sync', () => {
        expect(run.status).toEqual(0);
        expect(asActorsReportBlock({ stdout: run.stdout })).toContain('in sync, no role short');
      });
    });
  });

  given('[case2] a role linked by hand, then a manifest that omits it', () => {
    const testDir = genTempDir({ slug: 'init-actors-yml-extra' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      const prior = invokeRhachetCliBinary({
        args: ['init', '--roles', 'mechanic', 'architect'],
        cwd: testDir,
      });
      if (prior.status !== 0) throw new Error(`fixture init failed: ${prior.stderr}`);
      setActorsYml({
        dir: testDir,
        lines: [
          "ambient: '@solo'",
          'actor:',
          '  - slug: solo',
          '    brain: claude',
          '    roles: [ehmpathy/mechanic]',
          '',
        ],
      });
    });

    when('[t0] `init` with no --roles', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({ args: ['init'], cwd: testDir }),
      );

      then('the extra role is kept, never removed (F4)', () => {
        expect(run.status).toEqual(0);
        expect(getOneIsRoleLinked({ dir: testDir, role: 'architect' })).toEqual(true);
      });
      then('`<repo>/.claude` repoints from `repo=ambient` to the `ambient:` actor', () => {
        expect(realpathSync(join(testDir, '.claude'))).toEqual(
          realpathSync(join(testDir, '.agent', '.actors', 'actor.via.slug=solo', 'brain', '.claude')),
        );
      });
      then('the extra role is named, with both fixes', () => {
        const block = asActorsReportBlock({ stdout: run.stdout });
        expect(block).toContain('extra → kept, undeclared');
        expect(block).toContain('ehmpathy/architect');
        expect(block).toContain('to drop it, unlink .agent/repo=ehmpathy/role=architect');
      });
      then('the report block holds its shape', () => {
        expect(asActorsReportBlock({ stdout: run.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case3] `--roles` beside a manifest', () => {
    const testDir = genTempDir({ slug: 'init-actors-yml-roles' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      setActorsYml({ dir: testDir, lines: ACTORS_YML_CREW });
    });

    when('[t0] `init --roles mechanic`', () => {
      const run = useThen('exits 2', () =>
        invokeRhachetCliBinary({ args: ['init', '--roles', 'mechanic'], cwd: testDir }),
      );

      then('it is refused, and names the actors.yml edit', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('--roles is refused beside .agent/actors.yml');
        expect(run.stderr).toContain('edit the actor roles in .agent/actors.yml');
      });
      then('no role is linked', () => {
        expect(getOneIsRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(false);
      });
    });
  });

  given('[case4] a manifest with no `ambient:` key', () => {
    const testDir = genTempDir({ slug: 'init-actors-yml-invalid' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      setActorsYml({
        dir: testDir,
        lines: [
          'actor:',
          '  - slug: solo',
          '    brain: claude',
          '    roles: [ehmpathy/mechanic]',
          '',
        ],
      });
    });

    when('[t0] `init`', () => {
      const run = useThen('exits 2', () =>
        invokeRhachetCliBinary({ args: ['init'], cwd: testDir }),
      );

      then('it fails fast and names the key (S9)', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('actors.yml has no `ambient:` key');
        expect(run.stderr).toContain("'@solo'");
      });
      then('no write happened (case=7)', () => {
        expect(existsSync(join(testDir, '.agent', 'repo=ehmpathy'))).toEqual(false);
      });
    });
  });
});
