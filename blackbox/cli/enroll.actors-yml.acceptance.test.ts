import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { setupRoleFixtureRepo } from '@/blackbox/.test/infra/roleFixtureRepo';

/**
 * .what = writes a stub `claude` that exits 0, and returns a PATH that finds it first
 * .why = enroll authors the actor dir BEFORE it spawns the brain, so a 0-exit stub lets the
 *        whole run complete and leaves the actor dir to assert on
 */
const setupStubBrainPath = (input: { dir: string }): string => {
  const binDir = join(input.dir, '.stub-bin');
  mkdirSync(binDir, { recursive: true });
  const stubPath = join(binDir, 'claude');
  writeFileSync(
    stubPath,
    '#!/usr/bin/env bash\nif [ "$1" = "--version" ]; then echo "2.1.277 (Claude Code)"; fi\nexit 0\n',
    'utf-8',
  );
  chmodSync(stubPath, 0o755);
  return `${binDir}:${process.env.PATH ?? ''}`;
};

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

describe('rhx clone @<slug> under .agent/actors.yml (acceptance)', () => {
  given('[case1] a manifest with three declared actors, linked by init', () => {
    const dir = genTempDir({ slug: 'enroll-actors-yml' });
    const scene = useBeforeAll(async () => {
      setupRoleFixtureRepo({ dir });
      mkdirSync(join(dir, '.agent'), { recursive: true });
      writeFileSync(join(dir, '.agent', 'actors.yml'), ACTORS_YML.join('\n'));
      const init = invokeRhachetCliBinary({ args: ['init'], cwd: dir });
      if (init.status !== 0)
        throw new Error(`fixture init failed: ${init.stderr}`);
      return { path: setupStubBrainPath({ dir }) };
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
        expect(run.stderr).toContain('declared actors: @crew, @solo, @spare');
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
  });
});
