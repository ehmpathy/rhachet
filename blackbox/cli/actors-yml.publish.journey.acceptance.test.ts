import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { genTempDir, given, then, useThen, when } from 'test-fns';

import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { getOneIsRoleLinked } from '@/blackbox/.test/infra/roleFixtureRepo';
import { setActorsYml } from '@/blackbox/.test/infra/setActorsYml';

/**
 * .what = the wish's two 🔴 outcomes, walked at the cli grain, one repo through time:
 *         a role package publishes a named actor, a consumer adopts it by name and extends
 *         it, and when the package grows the actor, the consumer gains the role with no edit
 *
 * .why a journey = each step reads the state the prior one left: introspect emits what init
 *   reads, and the growth is proven only against the init that came before it
 *
 * .note = the package is a plain directory symlinked into the consumer's node_modules, so a
 *   re-introspect in the package is what the consumer's next init reads — the same tether an
 *   upgrade gives, with no install in the loop
 */

/** .what = the role slugs the surfschool package carries */
const SURFSCHOOL_ROLES = ['coach', 'lifeguard', 'scholar'] as const;

/**
 * .what = write the surfschool role package: an index.js registry, a readme and a brief per
 *         role, and the actors yml it publishes
 */
const setSurfschoolPackage = (input: { dir: string; actorsLines: string[] }): void => {
  mkdirSync(input.dir, { recursive: true });
  // introspect reads the package from its git root, as a package repo always is
  execSync('git init', { cwd: input.dir, stdio: 'pipe' });
  writeFileSync(
    join(input.dir, 'package.json'),
    JSON.stringify({ name: 'rhachet-roles-surfschool', version: '1.0.0', main: 'index.js' }, null, 2),
  );
  writeFileSync(join(input.dir, 'readme.md'), '# surfschool\n');
  for (const role of SURFSCHOOL_ROLES) {
    mkdirSync(join(input.dir, 'roles', role, 'briefs'), { recursive: true });
    mkdirSync(join(input.dir, 'roles', role, 'skills'), { recursive: true });
    writeFileSync(join(input.dir, 'roles', role, 'readme.md'), `# ${role}\n`);
    writeFileSync(join(input.dir, 'roles', role, 'briefs', `define.${role}.md`), `# ${role}\n`);
  }
  writeFileSync(
    join(input.dir, 'index.js'),
    [
      "const path = require('path');",
      `const roles = ${JSON.stringify(SURFSCHOOL_ROLES)}.map((slug) => ({`,
      '  slug,',
      '  name: slug,',
      '  purpose: `teach ${slug}`,',
      "  readme: { uri: path.join(__dirname, 'roles', slug, 'readme.md') },",
      '  traits: [],',
      "  briefs: { dirs: { uri: path.join(__dirname, 'roles', slug, 'briefs') } },",
      "  skills: { dirs: { uri: path.join(__dirname, 'roles', slug, 'skills') }, refs: [] },",
      '}));',
      'exports.getRoleRegistry = () => ({',
      "  slug: 'surfschool',",
      "  readme: { uri: path.join(__dirname, 'readme.md') },",
      '  roles,',
      "  actors: { uri: path.join(__dirname, 'actors.yml') },",
      '});',
      '',
    ].join('\n'),
  );
  writeFileSync(join(input.dir, 'actors.yml'), [...input.actorsLines, ''].join('\n'));
};

/**
 * .what = write a consumer repo that depends on the surfschool package, linked from `pkgDir`
 */
const setConsumerRepo = (input: { dir: string; pkgDir: string }): void => {
  execSync('git init', { cwd: input.dir, stdio: 'pipe' });
  writeFileSync(
    join(input.dir, 'package.json'),
    JSON.stringify(
      { name: 'consumer', version: '0.0.0', dependencies: { 'rhachet-roles-surfschool': '*' } },
      null,
      2,
    ),
  );
  mkdirSync(join(input.dir, 'node_modules'), { recursive: true });
  symlinkSync(input.pkgDir, join(input.dir, 'node_modules', 'rhachet-roles-surfschool'), 'dir');
};

/**
 * .what = slice the `🎭 actors.yml` report block out of `init` stdout
 */
const asActorsReportBlock = (input: { stdout: string }): string => {
  const lines = input.stdout.split('\n');
  const start = lines.findIndex((line) => line.startsWith('🎭 actors.yml'));
  if (start === -1) return input.stdout;
  const end = lines.findIndex((line, index) => index > start && line === '');
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
};

/** .what = the consumer manifest: adopt the published instructor by name, plus one role */
const ACTORS_YML_CONSUMER = [
  "ambient: '@crew'",
  'actor:',
  '  - slug: crew',
  '    roles:',
  "      - '@surfschool/instructor'",
  '      - +surfschool/scholar',
  '',
];

describe('actors.yml, published by a role package and adopted by a repo (journey)', () => {
  const root = genTempDir({ slug: 'actors-yml-publish-journey' });
  const pkgDir = join(root, 'pkg');
  const repoDir = join(root, 'repo');
  beforeAll(() => {
    // the package publishes `instructor` with a BARE role slug — its own role (fix 1)
    setSurfschoolPackage({
      dir: pkgDir,
      actorsLines: ['actor:', '  - slug: instructor', '    brain: claude', '    roles: [coach]'],
    });
    mkdirSync(repoDir, { recursive: true });
    setConsumerRepo({ dir: repoDir, pkgDir });
  });

  given('[case1] the package introspects, the consumer adopts and extends its actor', () => {
    when('[t0] `repo introspect` in the package', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({ args: ['repo', 'introspect'], cwd: pkgDir }),
      );

      then('rhachet.repo.yml carries the actor, its bare role qualified to the package', () => {
        expect(run.status).toEqual(0);
        const yml = readFileSync(join(pkgDir, 'rhachet.repo.yml'), 'utf8');
        expect(yml).toContain('actors:');
        expect(yml).toContain('slug: instructor');
        expect(yml).toContain('surfschool/coach');
      });
    });

    when('[t1] the consumer writes actors.yml, then `init`', () => {
      const run = useThen('exits 0', () => {
        setActorsYml({ dir: repoDir, lines: ACTORS_YML_CONSUMER });
        return invokeRhachetCliBinary({ args: ['init'], cwd: repoDir });
      });

      then('the published role and the local delta are both linked', () => {
        expect(run.status).toEqual(0);
        expect(getOneIsRoleLinked({ dir: repoDir, role: 'coach' })).toEqual(true);
        expect(getOneIsRoleLinked({ dir: repoDir, role: 'scholar' })).toEqual(true);
        expect(getOneIsRoleLinked({ dir: repoDir, role: 'lifeguard' })).toEqual(false);
      });
      then('the report names the repo actor and the published base', () => {
        const block = asActorsReportBlock({ stdout: run.stdout });
        expect(block).toContain('repo actor = @crew');
        expect(block).toContain('via @surfschool/instructor');
      });
      then('the report block holds its shape', () => {
        expect(asSnapshotSafe(asActorsReportBlock({ stdout: run.stdout }))).toMatchSnapshot();
      });
    });

    when('[t2] the package grows instructor by a role, re-introspects, then the consumer `init`s', () => {
      const run = useThen('exits 0', () => {
        writeFileSync(
          join(pkgDir, 'actors.yml'),
          ['actor:', '  - slug: instructor', '    brain: claude', '    roles: [coach, lifeguard]', ''].join('\n'),
        );
        const introspected = invokeRhachetCliBinary({ args: ['repo', 'introspect'], cwd: pkgDir });
        expect(introspected.status).toEqual(0);
        return invokeRhachetCliBinary({ args: ['init'], cwd: repoDir });
      });

      then('the grown role reaches the consumer with no edit to its actors.yml', () => {
        expect(run.status).toEqual(0);
        expect(getOneIsRoleLinked({ dir: repoDir, role: 'lifeguard' })).toEqual(true);
      });
      then('the report lists the new role, via the published base', () => {
        const block = asActorsReportBlock({ stdout: run.stdout });
        expect(block).toContain('surfschool/lifeguard');
        expect(block).toContain('via @surfschool/instructor');
      });
      then('the repo actor boots the grown set', () => {
        const bootMd = readFileSync(
          join(repoDir, '.agent', '.actors', 'actor.via.slug=crew', 'brain', '.claude', 'boot.md'),
          'utf8',
        );
        expect(bootMd).toContain('role=lifeguard');
        expect(bootMd).toContain('role=scholar');
      });
    });
  });

  given('[case2] an empty, comment-only actors.yml', () => {
    when('[t0] `init`', () => {
      const run = useThen('exits 2', () => {
        setActorsYml({ dir: repoDir, lines: ['# actors, soon', ''] });
        return invokeRhachetCliBinary({ args: ['init'], cwd: repoDir, logOnError: false });
      });

      then('it is refused, and names the `ambient:` key', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('ambient');
      });
      then('the refusal holds its shape', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] the rollback — actors.yml removed, then `init --roles`', () => {
    when('[t0] `init --roles surfschool/coach` with no manifest', () => {
      const run = useThen('exits 0', () => {
        rmSync(join(repoDir, '.agent', 'actors.yml'));
        return invokeRhachetCliBinary({
          args: ['init', '--roles', 'surfschool/coach'],
          cwd: repoDir,
        });
      });

      then('today\'s flag path runs again, as the --roles refusal advertised', () => {
        expect(run.status).toEqual(0);
        expect(existsSync(join(repoDir, '.agent', 'actors.yml'))).toEqual(false);
        expect(getOneIsRoleLinked({ dir: repoDir, role: 'coach' })).toEqual(true);
      });
    });
  });
});
