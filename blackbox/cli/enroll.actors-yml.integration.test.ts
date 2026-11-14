import { MalfunctionError } from 'helpful-errors';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { setupRichStubBrainPath } from '@/blackbox/.test/infra/enrollCloneHarness';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { setupRoleFixtureRepo } from '@/blackbox/.test/infra/roleFixtureRepo';
import { setActorsYml } from '@/blackbox/.test/infra/setActorsYml';

/**
 * .what = the actor dir names under the actors root
 */
const getAllActorDirNames = (input: { dir: string }): string[] =>
  readdirSync(join(input.dir, '.agent', '.actors')).filter((name) =>
    name.startsWith('actor.via.'),
  );

/**
 * .what = the roles an actor dir records in its `actor.json`
 */
const getActorRolesRecorded = (input: {
  dir: string;
  actorDirName: string;
}): string[] =>
  (
    JSON.parse(
      readFileSync(
        join(input.dir, '.agent', '.actors', input.actorDirName, 'actor.json'),
        'utf-8',
      ),
    ) as { roles: string[] }
  ).roles;

const ACTORS_YML = [
  "ambient: '@crew'",
  'actor:',
  '  - slug: crew',
  '    brain: claude',
  '    roles: [ehmpathy/mechanic, ehmpathy/ergonomist]',
  '  - slug: solo',
  '    brain: claude',
  '    roles: [ehmpathy/mechanic]',
  '  - slug: spare',
  '    brain: claude',
  '    roles: [ehmpathy/architect]',
  '',
];

/**
 * .note = an integration test, never acceptance: its subject is which actor dir and roleset a
 *   manifest form resolves to, and the brain-cli is the shared rich stub
 *   (`src/.test/assets/stubBrainCli.cjs`), which refuses an unknown option the way claude does.
 *   a stub-backed suite is integration grain (`rule.forbid.faked-or-quarantined-acceptance`);
 *   the real-brain reach suites own acceptance
 */
describe('rhx clone @<slug> under .agent/actors.yml (integration)', () => {
  given('[case1] a manifest with three declared actors, linked by init', () => {
    const dir = genTempDir({ slug: 'enroll-actors-yml' });
    const scene = useBeforeAll(async () => {
      setupRoleFixtureRepo({ dir });
      setActorsYml({ dir, lines: ACTORS_YML });
      const init = invokeRhachetCliBinary({ args: ['init'], cwd: dir });
      if (init.status !== 0)
        throw new MalfunctionError('fixture init failed', {
          stderr: init.stderr,
          hint: 'the fixture setup broke, not the case under test; read the stderr above, then rebuild (`npm run build`) if dist/ is stale',
        });
      return { path: setupRichStubBrainPath({ dir }) };
    });

    when('[t0] `clone @solo` (no override)', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['clone', '@solo'],
          cwd: dir,
          env: { PATH: scene.path },
          logOnError: false,
        }),
      );

      then('the clone lands in `actor.via.slug=solo`, with its declared roles', () => {
        expect(run.status).toEqual(0);
        expect(
          getActorRolesRecorded({ dir, actorDirName: 'actor.via.slug=solo' }),
        ).toEqual(['mechanic']);
      });
      then('no hash actor is minted', () => {
        expect(
          getAllActorDirNames({ dir }).filter((name) =>
            name.startsWith('actor.via.hash='),
          ),
        ).toEqual([]);
      });
    });

    when('[t1] `clone @solo +architect` (a role override)', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['clone', '@solo', '+architect'],
          cwd: dir,
          env: { PATH: scene.path },
          logOnError: false,
        }),
      );

      then('the clone lands in a derived actor `slug=solo._.delta=<h>`', () => {
        expect(run.status).toEqual(0);
        const derived = getAllActorDirNames({ dir }).filter((name) =>
          name.startsWith('actor.via.slug=solo._.delta='),
        );
        expect(derived).toHaveLength(1);
        expect(
          [...getActorRolesRecorded({ dir, actorDirName: derived[0]! })].sort(),
        ).toEqual(['architect', 'mechanic']);
      });
      then('the base actor `slug=solo` is untouched', () => {
        expect(
          getActorRolesRecorded({ dir, actorDirName: 'actor.via.slug=solo' }),
        ).toEqual(['mechanic']);
      });
    });

    when('[t2] `clone @solo --roles architect` (a plain role list)', () => {
      const run = useThen('exits 2', () =>
        invokeRhachetCliBinary({
          args: ['clone', '@solo', '--roles', 'architect'],
          cwd: dir,
          env: { PATH: scene.path },
          logOnError: false,
        }),
      );

      then('it is refused, and names the inline form', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('would replace the actor wholesale');
      });
      then('the refusal holds its shape', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t3] `clone @ghost` (an undeclared slug)', () => {
      const run = useThen('exits 2', () =>
        invokeRhachetCliBinary({
          args: ['clone', '@ghost'],
          cwd: dir,
          env: { PATH: scene.path },
          logOnError: false,
        }),
      );

      then('it is refused, and lists the declared actors', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('@ghost is not a declared actor');
        expect(run.stderr).toContain("use one of '@crew', '@solo', '@spare'");
      });
      then('the refusal holds its shape', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
      then('no actor dir is minted for it', () => {
        expect(
          getAllActorDirNames({ dir }).some((name) => name.includes('ghost')),
        ).toEqual(false);
      });
    });

    when('[t4] `enroll @spare` (the actor form, via enroll)', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['enroll', '@spare'],
          cwd: dir,
          env: { PATH: scene.path },
          logOnError: false,
        }),
      );

      then('the clone lands in `actor.via.slug=spare`', () => {
        expect(run.status).toEqual(0);
        expect(
          getActorRolesRecorded({ dir, actorDirName: 'actor.via.slug=spare' }),
        ).toEqual(['architect']);
      });
    });

    when('[t5] a bare `enroll` (no brain, no roles)', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['enroll'],
          cwd: dir,
          env: { PATH: scene.path },
          logOnError: false,
        }),
      );

      then('the clone lands in the repo actor `actor.via.slug=crew`', () => {
        expect(run.status).toEqual(0);
        expect(
          existsSync(join(dir, '.agent', '.actors', 'actor.via.slug=crew', 'clones')),
        ).toEqual(true);
      });
      then('no hash actor is minted', () => {
        expect(
          getAllActorDirNames({ dir }).filter((name) =>
            name.startsWith('actor.via.hash='),
          ),
        ).toEqual([]);
      });
    });

    when('[t6] `enroll claude --roles +architect` (the inline form)', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '+architect'],
          cwd: dir,
          env: { PATH: scene.path },
          logOnError: false,
        }),
      );

      then('the inline form stays hash-identified (F7)', () => {
        expect(run.status).toEqual(0);
        expect(
          getAllActorDirNames({ dir }).filter((name) =>
            name.startsWith('actor.via.hash='),
          ),
        ).toHaveLength(1);
      });
    });

    when('[t7] `clone @sollo` (a typo of a declared slug)', () => {
      const run = useThen('exits 2', () =>
        invokeRhachetCliBinary({
          args: ['clone', '@sollo'],
          cwd: dir,
          env: { PATH: scene.path },
          logOnError: false,
        }),
      );

      then('it is refused, and names the actor meant', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('@sollo is not a declared actor');
        expect(run.stderr).toContain("did you mean '@solo'?");
      });
      then('the refusal holds its shape', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t8] `clone claude --roles mechanic` (the inline form on clone)', () => {
      const run = useThen('exits 2', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'claude', '--roles', 'mechanic'],
          cwd: dir,
          env: { PATH: scene.path },
          logOnError: false,
        }),
      );

      then(
        'it is refused, and names the inline form and the actor form',
        () => {
          expect(run.status).toEqual(2);
          expect(run.stderr).toContain("rhx clone has no verb 'claude'");
          expect(run.stderr).toContain('rhx enroll <brain> --roles <roles>');
          expect(run.stderr).toContain('rhx clone @<slug>');
        },
      );
      then('the refusal holds its shape', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case2] a peer-only role that carries hooks (inventory.of=requirements.case=9)', () => {
    // the ambient actor holds `tester`; only the peer holds `reviewer`, whose hook no
    //   ambient clone may load
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({ fixture: 'with-role-hooks' });
      setActorsYml({
        dir: repo.path,
        lines: [
          "ambient: '@crew'",
          'actor:',
          '  - slug: crew',
          '    brain: claude',
          '    roles: [test/tester]',
          '  - slug: peer',
          '    brain: claude',
          '    roles: [test/reviewer]',
          '',
        ],
      });
      const home = genTempDir({ slug: 'enroll-actors-yml-hooks-home' });
      const init = invokeRhachetCliBinary({
        args: ['init'],
        cwd: repo.path,
        env: { HOME: home },
      });
      if (init.status !== 0)
        throw new MalfunctionError('fixture init failed', {
          stderr: init.stderr,
          hint: 'the fixture setup broke, not the case under test; read the stderr above, then rebuild (`npm run build`) if dist/ is stale',
        });
      return { dir: repo.path, home, path: setupRichStubBrainPath({ dir: repo.path }) };
    });

    when('[t0] a bare `enroll` (the repo actor `@crew`)', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['enroll'],
          cwd: scene.dir,
          env: { PATH: scene.path, HOME: scene.home },
          logOnError: false,
        }),
      );

      then('the clone spawns clean, with no leak refusal', () => {
        expect(run.stderr).not.toContain('not enrolled in');
        expect(run.status).toEqual(0);
      });
      then("the repo actor's settings hold its own roles' hooks, and no peer's", () => {
        const authors = getAllHookAuthors({
          dir: scene.dir,
          actorDirName: 'actor.via.slug=crew',
        });
        expect(authors).toContain('repo=test/role=tester');
        expect(authors).not.toContain('repo=test/role=reviewer');
      });
    });

    when('[t1] `enroll @peer` (the peer that holds the hooked role)', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['enroll', '@peer'],
          cwd: scene.dir,
          env: { PATH: scene.path, HOME: scene.home },
          logOnError: false,
        }),
      );

      then("the peer's settings hold its role's hooks, derived from the linked roles", () => {
        expect(run.status).toEqual(0);
        const authors = getAllHookAuthors({
          dir: scene.dir,
          actorDirName: 'actor.via.slug=peer',
        });
        expect(authors).toContain('repo=test/role=reviewer');
        expect(authors).not.toContain('repo=test/role=tester');
      });
    });

    when('[t2] `clone @crew +reviewer` (a derived actor over the repo actor)', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['clone', '@crew', '+reviewer'],
          cwd: scene.dir,
          env: { PATH: scene.path, HOME: scene.home },
          logOnError: false,
        }),
      );

      then('the derived actor holds the base roles plus its delta, and records the delta', () => {
        expect(run.status).toEqual(0);
        const derived = getAllActorDirNames({ dir: scene.dir }).filter((name) =>
          name.startsWith('actor.via.slug=crew._.delta='),
        );
        expect(derived).toHaveLength(1);
        const record = getActorRecord({ dir: scene.dir, actorDirName: derived[0]! });
        expect([...record.roles].sort()).toEqual(['reviewer', 'tester']);
        expect(record.rolesDelta).toEqual(['+reviewer']);
      });
    });

    when('[t3] actors.yml swaps the roles of @crew and @peer, then `rhx init` (the sync invariant)', () => {
      const scenePeerBefore = useBeforeAll(async () => ({
        boot: readFileSync(getBootPath({ dir: scene.dir, actorDirName: 'actor.via.slug=peer' }), 'utf-8'),
      }));
      const run = useThen('exits 0', () => {
        setActorsYml({
          dir: scene.dir,
          lines: [
            "ambient: '@crew'",
            'actor:',
            '  - slug: crew',
            '    brain: claude',
            '    roles: [test/reviewer]',
            '  - slug: peer',
            '    brain: claude',
            '    roles: [test/tester]',
            '',
          ],
        });
        return invokeRhachetCliBinary({
          args: ['init'],
          cwd: scene.dir,
          env: { HOME: scene.home },
        });
      });

      then("the peer's record and settings move to its new roles, with no clone spawned", () => {
        expect(run.status).toEqual(0);
        expect(
          getActorRecord({ dir: scene.dir, actorDirName: 'actor.via.slug=peer' }).roles,
        ).toEqual(['tester']);
        const authors = getAllHookAuthors({
          dir: scene.dir,
          actorDirName: 'actor.via.slug=peer',
        });
        expect(authors).toContain('repo=test/role=tester');
        expect(authors).not.toContain('repo=test/role=reviewer');
      });
      then("the peer's boot.md is re-rendered for its new roles", () => {
        const boot = readFileSync(
          getBootPath({ dir: scene.dir, actorDirName: 'actor.via.slug=peer' }),
          'utf-8',
        );
        expect(boot).not.toEqual(scenePeerBefore.boot);
        expect(boot).toContain('role=tester');
        expect(boot).not.toContain('role=reviewer');
      });
      then("the repo actor's settings move to its new roles", () => {
        const authors = getAllHookAuthors({
          dir: scene.dir,
          actorDirName: 'actor.via.slug=crew',
        });
        expect(authors).toContain('repo=test/role=reviewer');
        expect(authors).not.toContain('repo=test/role=tester');
      });
      then('the derived actor re-derives from its base today, plus its delta', () => {
        const derived = getAllActorDirNames({ dir: scene.dir }).filter((name) =>
          name.startsWith('actor.via.slug=crew._.delta='),
        );
        expect(
          getActorRecord({ dir: scene.dir, actorDirName: derived[0]! }).roles,
        ).toEqual(['reviewer']);
      });
    });
  });

  given('[case3] a repo with linked roles and no .agent/actors.yml', () => {
    const dir = genTempDir({ slug: 'enroll-actors-yml-absent' });
    const scene = useBeforeAll(async () => {
      setupRoleFixtureRepo({ dir });
      const init = invokeRhachetCliBinary({
        args: ['init', '--roles', 'mechanic'],
        cwd: dir,
      });
      if (init.status !== 0)
        throw new MalfunctionError('fixture init failed', {
          stderr: init.stderr,
          hint: 'the fixture setup broke, not the case under test; read the stderr above, then rebuild (`npm run build`) if dist/ is stale',
        });
      return { path: setupRichStubBrainPath({ dir }) };
    });

    when('[t0] `clone @scholar` (the actor form, before a manifest is adopted)', () => {
      const run = useThen('exits 2', () =>
        invokeRhachetCliBinary({
          args: ['clone', '@scholar'],
          cwd: dir,
          env: { PATH: scene.path },
          logOnError: false,
        }),
      );

      then('it is refused, and names both ways forward', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain(
          '@scholar is not reachable — this repo has no .agent/actors.yml',
        );
        expect(run.stderr).toContain('declare @scholar in .agent/actors.yml');
        expect(run.stderr).toContain('rhx enroll <brain> --roles <roles>');
      });
      then('the refusal holds its shape', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
      then('no actor dir is minted for it', () => {
        expect(
          getAllActorDirNames({ dir }).some((name) => name.includes('scholar')),
        ).toEqual(false);
      });
    });
  });
});

/**
 * .what = an actor's `actor.json`, as recorded
 */
const getActorRecord = (input: {
  dir: string;
  actorDirName: string;
}): { roles: string[]; rolesDelta: string[] | null } =>
  JSON.parse(
    readFileSync(
      join(input.dir, '.agent', '.actors', input.actorDirName, 'actor.json'),
      'utf-8',
    ),
  ) as { roles: string[]; rolesDelta: string[] | null };

/**
 * .what = the path of an actor's rendered `boot.md`
 */
const getBootPath = (input: { dir: string; actorDirName: string }): string =>
  join(input.dir, '.agent', '.actors', input.actorDirName, 'brain', '.claude', 'boot.md');

/**
 * .what = every hook author an actor's `settings.of.repo.json` names
 */
const getAllHookAuthors = (input: {
  dir: string;
  actorDirName: string;
}): string[] => {
  const settings = JSON.parse(
    readFileSync(
      join(
        input.dir,
        '.agent',
        '.actors',
        input.actorDirName,
        'brain',
        '.claude',
        'settings.of.repo.json',
      ),
      'utf-8',
    ),
  ) as {
    hooks?: Record<string, Array<{ hooks: Array<{ author?: string }> }>>;
  };
  return Object.values(settings.hooks ?? {}).flatMap((entries) =>
    entries.flatMap((entry) => entry.hooks.map((hook) => hook.author ?? '')),
  );
};
