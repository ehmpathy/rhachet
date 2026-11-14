import { given, then, useBeforeAll, when } from 'test-fns';

import { genSampleRepoWithRoles } from '@src/.test/assets/genSampleRepoWithRoles';
import { ContextCli } from '@src/domain.objects/ContextCli';
import { findsertActorOndisk } from '@src/domain.operations/actor/enrolled/findsertActorOndisk';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setDeclaredActorsOndisk } from './setDeclaredActorsOndisk';

const ROLES_FIXTURE = [
  { repo: 'fixture', role: 'any' },
  { repo: 'fixture', role: 'zeta' },
  { repo: 'fixture', role: 'omega' },
];

/**
 * .what = read one actor's `actor.json` roles
 */
const getOneActorRoles = (input: { repoPath: string; exid: string }) =>
  (
    JSON.parse(
      readFileSync(join(getActorOndiskDir(input), 'actor.json'), 'utf8'),
    ) as { roles: string[] }
  ).roles;

/**
 * .what = enroll one declared actor at the given roles, as a stale record to re-derive from
 */
const setSampleDeclaredActor = async (input: {
  repoPath: string;
  exid: string;
  roles: string[];
}) =>
  findsertActorOndisk(
    {
      repoPath: input.repoPath,
      brain: 'claude',
      roles: input.roles,
      delta: input.roles.join(','),
      reason: null,
      exidDeclared: input.exid,
      logEnrollment: false,
    },
    { repo: { ambient: { exid: 'slug=crew', roles: input.roles } } },
  );

describe('setDeclaredActorsOndisk', () => {
  given('[case1] a repo with no actors.yml', () => {
    const repoPath = genSampleRepoWithRoles({
      slug: 'declared-actors-none',
      roles: ROLES_FIXTURE,
    });

    when('[t0] the declared actors sync', () => {
      const result = useBeforeAll(async () =>
        setDeclaredActorsOndisk(
          { repoPath, refsLinked: ROLES_FIXTURE, rolesAmbient: ['any'] },
          new ContextCli({ cwd: repoPath, gitroot: repoPath }),
        ),
      );

      then('naught is re-derived, and no failure is collected', () => {
        expect(result).toEqual({ rederived: [], failures: [] });
      });
    });
  });

  given(
    '[case2] `ambient: @crew`, a peer `@peer`, and a slug actor whose slug left actors.yml — each record stale',
    () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genSampleRepoWithRoles({
          slug: 'declared-actors-stale',
          roles: ROLES_FIXTURE,
        });
        // a real repo carries a package.json; the expander reads it for installed packages
        writeFileSync(
          join(repoPath, 'package.json'),
          JSON.stringify({ name: 'declared-actors-stale', private: true }),
        );
        writeFileSync(
          join(repoPath, '.agent', 'actors.yml'),
          [
            "ambient: '@crew'",
            'actor:',
            '  - slug: crew',
            '    brain: claude',
            '    roles: [fixture/any, fixture/zeta]',
            '  - slug: peer',
            '    brain: claude',
            '    roles: [fixture/omega]',
            '',
          ].join('\n'),
        );
        await setSampleDeclaredActor({
          repoPath,
          exid: 'slug=crew',
          roles: ['any'],
        });
        await setSampleDeclaredActor({
          repoPath,
          exid: 'slug=peer',
          roles: ['zeta'],
        });
        await setSampleDeclaredActor({
          repoPath,
          exid: 'slug=ghost',
          roles: ['zeta'],
        });
        return { repoPath };
      });

      when('[t0] the declared actors sync over ambient [any, zeta]', () => {
        const result = useBeforeAll(async () =>
          setDeclaredActorsOndisk(
            {
              repoPath: scene.repoPath,
              refsLinked: ROLES_FIXTURE,
              rolesAmbient: ['any', 'zeta'],
            },
            new ContextCli({ cwd: scene.repoPath, gitroot: scene.repoPath }),
          ),
        );

        then('no failure is collected', () => {
          expect(result.failures).toEqual([]);
        });

        then('the repo actor re-derives to the ambient roles', () => {
          const crew = result.rederived.find(
            (one) => one.actorExid === 'slug=crew',
          );
          expect(crew?.before).toEqual(['any']);
          expect([...(crew?.after ?? [])].sort()).toEqual(['any', 'zeta']);
          expect(
            [
              ...getOneActorRoles({
                repoPath: scene.repoPath,
                exid: 'slug=crew',
              }),
            ].sort(),
          ).toEqual(['any', 'zeta']);
        });

        then('the peer re-derives to its declared roles', () => {
          const roles = getOneActorRoles({
            repoPath: scene.repoPath,
            exid: 'slug=peer',
          });
          expect(roles).toEqual(['omega']);
        });

        then('the actor whose slug left actors.yml is left as it was', () => {
          expect(
            result.rederived.some((one) => one.actorExid === 'slug=ghost'),
          ).toEqual(false);
          expect(
            getOneActorRoles({ repoPath: scene.repoPath, exid: 'slug=ghost' }),
          ).toEqual(['zeta']);
        });
      });

      when('[t1] the declared actors sync again', () => {
        const result = useBeforeAll(async () =>
          setDeclaredActorsOndisk(
            {
              repoPath: scene.repoPath,
              refsLinked: ROLES_FIXTURE,
              rolesAmbient: ['any', 'zeta'],
            },
            new ContextCli({ cwd: scene.repoPath, gitroot: scene.repoPath }),
          ),
        );

        then('no actor moves — the sync is idempotent', () => {
          expect(result).toEqual({ rederived: [], failures: [] });
        });
      });
    },
  );
});
