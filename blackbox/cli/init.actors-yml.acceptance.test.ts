import { MalfunctionError } from 'helpful-errors';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { genTempDir, given, then, useThen, when } from 'test-fns';

import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import {
  getOneIsRoleLinked,
  setupRoleFixtureRepo,
} from '@/blackbox/.test/infra/roleFixtureRepo';
import { setActorsYml } from '@/blackbox/.test/infra/setActorsYml';

/**
 * .what = slice one block out of `init` stdout — from the line that opens with `header` to the
 *         next blank line
 * .why = each case snaps the block it is about; the rest of the stdout belongs to the extant init
 *        surface and carries host-varied counts this case has no stake in
 * .note = an absent header yields the whole stdout, so the snapshot shows what was printed instead
 */
const asStdoutBlock = (input: { stdout: string; header: string }): string => {
  const lines = input.stdout.split('\n');
  const start = lines.findIndex((line) => line.startsWith(input.header));
  if (start === -1) return input.stdout;
  const end = lines.findIndex((line, index) => index > start && line === '');
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
};

/**
 * .what = slice the `🎭 actors.yml` report block out of `init` stdout
 */
const asActorsReportBlock = (input: { stdout: string }): string =>
  asStdoutBlock({ stdout: input.stdout, header: '🎭 actors.yml' });

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
      then('the brain dir header names the repo actor, `brain://slug=crew`', () => {
        const block = asStdoutBlock({ stdout: run.stdout, header: '🧠 brain://' });
        expect(block).toContain('brain://slug=crew');
        expect(block).toMatchSnapshot();
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
      if (prior.status !== 0)
        throw new MalfunctionError('fixture init failed', {
          stderr: prior.stderr,
          hint: 'the fixture setup broke, not the case under test; read the stderr above, then rebuild (`npm run build`) if dist/ is stale',
        });
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
      then('the refusal holds its shape', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
      then('no role is linked', () => {
        expect(getOneIsRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(false);
      });
    });

    when('[t1] `init --roles -behaver`, an incremental delta', () => {
      const run = useThen('exits 2', () =>
        invokeRhachetCliBinary({ args: ['init', '--roles', '-behaver'], cwd: testDir }),
      );

      then('it is refused too, and names the actors.yml edit (requirement 1, F13)', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('--roles is refused beside .agent/actors.yml');
        expect(run.stderr).toContain('edit the actor roles in .agent/actors.yml');
      });
      then('the refusal holds its shape', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] `init --prep`', () => {
      const run = useThen('exits 2', () =>
        invokeRhachetCliBinary({ args: ['init', '--prep'], cwd: testDir }),
      );

      then('it is refused, and names the bare `rhx init` replay', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('--prep is refused beside .agent/actors.yml');
        expect(run.stderr).toContain('the manifest is the replay');
      });
      then('the refusal holds its shape', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
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
      then('the refusal holds its shape', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
      then('no write happened (case=7)', () => {
        expect(existsSync(join(testDir, '.agent', 'repo=ehmpathy'))).toEqual(false);
      });
    });
  });

  given('[case5] a native `.this` role that no actor declares', () => {
    const testDir = genTempDir({ slug: 'init-actors-yml-native' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      const roleDir = join(testDir, '.agent', 'repo=.this', 'role=tuner');
      mkdirSync(join(roleDir, 'briefs'), { recursive: true });
      writeFileSync(join(roleDir, 'readme.md'), '# tuner\n');
      writeFileSync(join(roleDir, 'briefs', 'perf.md'), '# perf\n');
      // a native role is live only once it declares a boot.yml
      writeFileSync(
        join(roleDir, 'boot.yml'),
        ['always:', '  briefs:', '    say:', '      - briefs/perf.md', ''].join('\n'),
      );
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
    const getBootOfSolo = (): string =>
      readFileSync(
        join(testDir, '.agent', '.actors', 'actor.via.slug=solo', 'brain', '.claude', 'boot.md'),
        'utf8',
      );

    when('[t0] `init` with no --roles', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({ args: ['init'], cwd: testDir }),
      );

      then('the loss is named, with the fix under the ambient actor', () => {
        expect(run.status).toEqual(0);
        const block = asActorsReportBlock({ stdout: run.stdout });
        expect(block).toContain('native → not booted, undeclared');
        expect(block).toContain(
          'to boot it, declare `.this/tuner` under @solo in .agent/actors.yml',
        );
      });
      then('the report block holds its shape', () => {
        expect(asActorsReportBlock({ stdout: run.stdout })).toMatchSnapshot();
      });
      then('no role is added by itself — the repo actor does not boot it', () => {
        expect(getBootOfSolo()).not.toContain('role=tuner');
      });
    });

    when('[t1] the fix is applied — `.this/tuner` declared under @solo — then `init`', () => {
      const run = useThen('exits 0', () => {
        setActorsYml({
          dir: testDir,
          lines: [
            "ambient: '@solo'",
            'actor:',
            '  - slug: solo',
            '    brain: claude',
            '    roles: [ehmpathy/mechanic, .this/tuner]',
            '',
          ],
        });
        return invokeRhachetCliBinary({ args: ['init'], cwd: testDir });
      });

      then('the native row is gone, and the repo actor boots the role', () => {
        expect(run.status).toEqual(0);
        expect(asActorsReportBlock({ stdout: run.stdout })).not.toContain('native →');
        expect(getBootOfSolo()).toContain('role=tuner');
      });
    });
  });

  given('[case6] `--keys` beside a manifest, with no --roles', () => {
    const testDir = genTempDir({ slug: 'init-actors-yml-keys' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      setActorsYml({ dir: testDir, lines: ACTORS_YML_CREW });
    });

    when('[t0] `init --keys`', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({ args: ['init', '--keys'], cwd: testDir }),
      );

      then('the manifest names the roles, so --keys needs no --roles', () => {
        expect(run.status).toEqual(0);
        expect(run.stderr).not.toContain('--keys requires --roles');
      });
      then('the keyrack init runs over the declared union', () => {
        expect(run.stdout).toContain('🔑 keyrack init');
        expect(existsSync(join(testDir, '.agent', 'keyrack.yml'))).toEqual(true);
      });
      then('the keyrack block holds its shape', () => {
        expect(
          asSnapshotSafe(asStdoutBlock({ stdout: run.stdout, header: '🔑 keyrack init' })),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case7] a declared actor, then a manifest that drops its slug (F15)', () => {
    const testDir = genTempDir({ slug: 'init-actors-yml-orphan' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      setActorsYml({ dir: testDir, lines: ACTORS_YML_CREW });
      const prior = invokeRhachetCliBinary({ args: ['init'], cwd: testDir });
      if (prior.status !== 0)
        throw new MalfunctionError('fixture init failed', {
          stderr: prior.stderr,
          hint: 'the fixture setup broke, not the case under test; read the stderr above, then rebuild (`npm run build`) if dist/ is stale',
        });
      // an `@reader` clone once ran here; its actor dir (and any clone in it) outlives the slug
      mkdirSync(
        join(testDir, '.agent', '.actors', 'actor.via.slug=reader', 'clones'),
        { recursive: true },
      );
      setActorsYml({
        dir: testDir,
        lines: [
          "ambient: '@crew'",
          'actor:',
          '  - slug: crew',
          '    brain: claude',
          '    roles: [ehmpathy/mechanic, bhuild/behaver]',
          '',
        ],
      });
    });

    when('[t0] `init` with no --roles', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({ args: ['init'], cwd: testDir }),
      );

      then('the dropped actor dir is kept, never removed', () => {
        expect(run.status).toEqual(0);
        expect(
          existsSync(join(testDir, '.agent', '.actors', 'actor.via.slug=reader')),
        ).toEqual(true);
      });
      then('the report names the kept dir, with both fixes', () => {
        const block = asActorsReportBlock({ stdout: run.stdout });
        expect(block).toContain('actor dirs → kept, slug undeclared');
        expect(block).toContain('actor.via.slug=reader');
        expect(block).toContain('re-declare `@reader` in .agent/actors.yml');
        expect(block).toContain('rhx clone prune');
      });
      then('the report block holds its shape', () => {
        expect(asActorsReportBlock({ stdout: run.stdout })).toMatchSnapshot();
      });
    });
  });

  /**
   * .what = every manifest mistake a human can author, each refused by `init` with a named fix
   * .why = the manifest is a new surface a human writes by hand; each refusal frame is snapped so
   *        its headline, hint and metadata cannot drift unseen
   */
  const CASES_MANIFEST_REFUSED = [
    {
      description: 'an unquoted `@` value',
      lines: ['ambient: @crew', 'actor:', '  - slug: crew', '    brain: claude', '    roles: [ehmpathy/mechanic]', ''],
      message: 'actors.yml has an unquoted `@` value',
    },
    {
      description: 'invalid yaml',
      lines: ["ambient: '@crew'", 'actor:', '  - slug: crew', '   brain: [claude', ''],
      message: 'actors.yml has invalid yaml',
    },
    {
      description: 'a base that names an undeclared peer',
      lines: ["ambient: '@crew'", 'actor:', '  - slug: crew', "    roles: ['@nobody']", ''],
      message: 'actors.yml names an actor not declared: @nobody',
    },
    {
      description: 'a published base whose package is not installed',
      lines: ["ambient: '@crew'", 'actor:', '  - slug: crew', "    roles: ['@ghlitch/watcher']", ''],
      message: 'published actor not found: @ghlitch/watcher',
    },
    {
      description: 'an extension cycle',
      lines: ["ambient: '@a'", 'actor:', '  - slug: a', "    roles: ['@b']", '  - slug: b', "    roles: ['@a']", ''],
      message: 'actors.yml has an extension cycle',
    },
    {
      description: 'concrete roles mixed with deltas',
      lines: ["ambient: '@a'", 'actor:', '  - slug: a', '    brain: claude', '    roles: [ehmpathy/mechanic, -driver]', ''],
      message: 'actors.yml actor @a mixes concrete roles with a base or deltas',
    },
    {
      description: 'deltas with no base',
      lines: ["ambient: '@a'", 'actor:', '  - slug: a', '    brain: claude', "    roles: ['+mechanic']", ''],
      message: 'actors.yml actor @a has deltas with no base',
    },
    {
      description: 'two bases',
      lines: ["ambient: '@a'", 'actor:', '  - slug: a', "    roles: ['@b', '@c']", ''],
      message: 'actors.yml actor @a names more than one base',
    },
    {
      description: 'an actor that reaches no brain',
      lines: ["ambient: '@a'", 'actor:', '  - slug: a', '    roles: [ehmpathy/mechanic]', ''],
      message: 'actors.yml actor @a reaches no brain',
    },
  ];

  given('[case8] a manifest with an authored mistake', () => {
    CASES_MANIFEST_REFUSED.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}, then \`init\``, () => {
        const testDir = genTempDir({ slug: 'init-actors-yml-refused' });
        const run = useThen('exits 2', () => {
          setupRoleFixtureRepo({ dir: testDir });
          setActorsYml({ dir: testDir, lines: thisCase.lines });
          return invokeRhachetCliBinary({
            args: ['init'],
            cwd: testDir,
            logOnError: false,
          });
        });

        then('it fails fast and names the mistake', () => {
          expect(run.status).toEqual(2);
          expect(run.stderr).toContain(thisCase.message);
          expect(run.stderr).toContain('hint');
        });
        then('the refusal holds its shape', () => {
          expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
        });
        then('no role is linked', () => {
          expect(existsSync(join(testDir, '.agent', 'repo=ehmpathy'))).toEqual(
            false,
          );
        });
        then('the repo actor brain dir is never written — the refusal precedes every write', () => {
          expect(
            existsSync(
              join(testDir, '.agent', '.actors', 'actor.via.repo=ambient'),
            ),
          ).toEqual(false);
        });
      }),
    );
  });
});
