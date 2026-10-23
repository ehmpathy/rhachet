import { given, then, useBeforeAll, when } from 'test-fns';

import { genSampleHookOfRole } from '@src/.test/assets/genSampleHookOfRole';
import { genSampleRepoWithRoles } from '@src/.test/assets/genSampleRepoWithRoles';
import { REPO_ACTOR_EXID } from '@src/domain.operations/actor/enrolled/constants';
import { findsertActorOndisk } from '@src/domain.operations/actor/enrolled/findsertActorOndisk';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';
import { getRepoAmbientRoleFociPath } from '@src/domain.operations/actor/enrolled/getRepoAmbientRoleFociPath';

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { setDeltaActorsOndisk } from './setDeltaActorsOndisk';

const asHookOfRole = genSampleHookOfRole;

/**
 * .what = read one actor's `actor.json`
 */
const getOneActorManifest = (input: { repoPath: string; exid: string }) =>
  JSON.parse(
    readFileSync(join(getActorOndiskDir(input), 'actor.json'), 'utf8'),
  ) as {
    roles: string[];
    rolesDelta: string[] | null;
  };

/**
 * .what = read one actor's `settings.of.repo.json`
 * .note = apart from the manifest read: an actor that never re-derives has no
 *   settings file here, since only enroll and the re-derive write one
 */
const getOneActorSettings = (input: { repoPath: string; exid: string }) =>
  readFileSync(
    join(
      getBrainOndiskDir({ actorDir: getActorOndiskDir(input) }),
      'settings.of.repo.json',
    ),
    'utf8',
  );

describe('setDeltaActorsOndisk', () => {
  given(
    '[case1] a `-omega` delta actor and an absolute actor, enrolled over [any, zeta, omega]',
    () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genSampleRepoWithRoles({
          slug: 'sync-delta-actors',
          roles: [
            { repo: 'fixture', role: 'any' },
            { repo: 'fixture', role: 'zeta' },
            { repo: 'fixture', role: 'omega' },
          ],
        });

        // the repo actor's settings.of.repo.json — the source every actor narrows from
        const repoBrainDir = getBrainOndiskDir({
          actorDir: getOneRepoActorOndiskDir({ repoPath }),
        });
        mkdirSync(repoBrainDir, { recursive: true });
        writeFileSync(
          join(repoBrainDir, 'settings.of.repo.json'),
          JSON.stringify({
            hooks: {
              SessionStart: [
                asHookOfRole({ role: 'any' }),
                asHookOfRole({ role: 'zeta' }),
                asHookOfRole({ role: 'omega' }),
              ],
            },
          }),
        );

        // enroll both actors over the original ambient set
        const context = {
          repo: { ambient: { roles: ['any', 'zeta', 'omega'] } },
        };
        const deltaActor = await findsertActorOndisk(
          {
            repoPath,
            brain: 'claude',
            roles: ['any', 'zeta'],
            rolesDelta: ['-omega'],
            delta: '-omega',
            reason: null,
            logEnrollment: false,
          },
          context,
        );
        const absoluteActor = await findsertActorOndisk(
          {
            repoPath,
            brain: 'claude',
            roles: ['zeta', 'omega'],
            delta: 'zeta,omega',
            reason: null,
            logEnrollment: false,
          },
          context,
        );
        return { repoPath, deltaActor, absoluteActor };
      });

      when('[t0] zeta leaves the repo, then the delta actors sync', () => {
        const result = useBeforeAll(async () =>
          setDeltaActorsOndisk({
            repoPath: scene.repoPath,
            rolesLinked: ['any', 'omega'],
          }),
        );

        then(
          'the delta actor re-derives to [any], and no failure is collected',
          () => {
            expect(result.failures).toEqual([]);
            expect(result.rederived).toEqual([
              {
                actorExid: scene.deltaActor.exid,
                before: ['any', 'zeta'],
                after: ['any'],
              },
            ]);
          },
        );

        then('its actor.json holds the fresh roles and keeps its delta', () => {
          const manifest = getOneActorManifest({
            repoPath: scene.repoPath,
            exid: scene.deltaActor.exid,
          });
          expect(manifest.roles).toEqual(['any']);
          expect(manifest.rolesDelta).toEqual(['-omega']);
        });

        then(
          'its settings.of.repo.json holds the hooks of its fresh roles alone',
          () => {
            const settings = getOneActorSettings({
              repoPath: scene.repoPath,
              exid: scene.deltaActor.exid,
            });
            expect(settings).toContain('role=any');
            expect(settings).not.toContain('role=zeta');
            expect(settings).not.toContain('role=omega');
          },
        );

        then('the absolute actor keeps the roles it named', () => {
          const manifest = getOneActorManifest({
            repoPath: scene.repoPath,
            exid: scene.absoluteActor.exid,
          });
          expect(manifest.roles).toEqual(['zeta', 'omega']);
          expect(manifest.rolesDelta).toEqual(null);
        });
      });

      when('[t1] the delta actors sync again over the same linked set', () => {
        const result = useBeforeAll(async () =>
          setDeltaActorsOndisk({
            repoPath: scene.repoPath,
            rolesLinked: ['any', 'omega'],
          }),
        );

        then('no actor moves — the sync is idempotent', () => {
          expect(result.failures).toEqual([]);
          expect(result.rederived).toEqual([]);
        });
      });
    },
  );

  given(
    '[case2] a `-omega` delta actor, enrolled over [any, zeta, omega], then omega itself leaves the repo',
    () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genSampleRepoWithRoles({
          slug: 'sync-delta-actors-collapse',
          roles: [
            { repo: 'fixture', role: 'any' },
            { repo: 'fixture', role: 'zeta' },
            { repo: 'fixture', role: 'omega' },
          ],
        });
        const deltaActor = await findsertActorOndisk(
          {
            repoPath,
            brain: 'claude',
            roles: ['any', 'zeta'],
            rolesDelta: ['-omega'],
            delta: '-omega',
            reason: null,
            logEnrollment: false,
          },
          { repo: { ambient: { roles: ['any', 'zeta', 'omega'] } } },
        );
        return { repoPath, deltaActor };
      });

      when('[t0] the delta actors sync over [any, zeta]', () => {
        const result = useBeforeAll(async () =>
          setDeltaActorsOndisk({
            repoPath: scene.repoPath,
            rolesLinked: ['any', 'zeta'],
          }),
        );

        then(
          'the delta re-derives to the roles it holds, so naught is rewritten',
          () => {
            expect(result.failures).toEqual([]);
            expect(result.rederived).toEqual([]);
          },
        );

        then('the delta actor keeps its dir, its roles and its delta', () => {
          const manifest = getOneActorManifest({
            repoPath: scene.repoPath,
            exid: scene.deltaActor.exid,
          });
          expect(manifest.roles).toEqual(['any', 'zeta']);
          expect(manifest.rolesDelta).toEqual(['-omega']);
        });
      });

      when(
        '[t1] the same delta is enrolled again over the new ambient set',
        () => {
          const actor = useBeforeAll(
            async () =>
              await findsertActorOndisk(
                {
                  repoPath: scene.repoPath,
                  brain: 'claude',
                  roles: ['any', 'zeta'],
                  rolesDelta: ['-omega'],
                  delta: '-omega',
                  reason: null,
                  logEnrollment: false,
                },
                { repo: { ambient: { roles: ['any', 'zeta'] } } },
              ),
          );

          then(
            'it lands on the repo actor — no new hash dir is minted for the ambient set',
            () => {
              expect(actor.exid).toEqual(REPO_ACTOR_EXID);
            },
          );
        },
      );
    },
  );

  given(
    '[case3] a `-omega` delta actor whose settings write faults the first time',
    () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genSampleRepoWithRoles({
          slug: 'sync-delta-actors-converge',
          roles: [
            { repo: 'fixture', role: 'any' },
            { repo: 'fixture', role: 'zeta' },
            { repo: 'fixture', role: 'omega' },
          ],
        });
        const repoBrainDir = getBrainOndiskDir({
          actorDir: getOneRepoActorOndiskDir({ repoPath }),
        });
        mkdirSync(repoBrainDir, { recursive: true });
        const deltaActor = await findsertActorOndisk(
          {
            repoPath,
            brain: 'claude',
            roles: ['any', 'zeta'],
            rolesDelta: ['-omega'],
            delta: '-omega',
            reason: null,
            logEnrollment: false,
          },
          { repo: { ambient: { roles: ['any', 'zeta', 'omega'] } } },
        );

        // the source the settings derive from is unparseable, so the derivation faults
        const repoSettingsPath = join(repoBrainDir, 'settings.of.repo.json');
        writeFileSync(repoSettingsPath, '{ not json');
        const first = await setDeltaActorsOndisk({
          repoPath,
          rolesLinked: ['any', 'omega'],
        });
        const manifestAfterFault = getOneActorManifest({
          repoPath,
          exid: deltaActor.exid,
        });

        // the source is repaired, then the sync runs again
        writeFileSync(
          repoSettingsPath,
          JSON.stringify({
            hooks: {
              SessionStart: [
                asHookOfRole({ role: 'any' }),
                asHookOfRole({ role: 'zeta' }),
              ],
            },
          }),
        );
        const second = await setDeltaActorsOndisk({
          repoPath,
          rolesLinked: ['any', 'omega'],
        });
        return { repoPath, deltaActor, first, manifestAfterFault, second };
      });

      when('[t0] the first sync faults on the settings write', () => {
        then('the fault is collected for that actor', () => {
          expect(scene.first.failures).toHaveLength(1);
          expect(scene.first.rederived).toEqual([]);
        });

        then('its actor.json still holds the old roles', () => {
          expect(scene.manifestAfterFault.roles).toEqual(['any', 'zeta']);
        });
      });

      when('[t1] the sync runs again once the source is repaired', () => {
        then('the actor re-derives — the retry converges', () => {
          expect(scene.second.failures).toEqual([]);
          expect(scene.second.rederived).toEqual([
            {
              actorExid: scene.deltaActor.exid,
              before: ['any', 'zeta'],
              after: ['any'],
            },
          ]);
        });

        then('its settings hold the hooks of its fresh roles alone', () => {
          const settings = getOneActorSettings({
            repoPath: scene.repoPath,
            exid: scene.deltaActor.exid,
          });
          expect(settings).toContain('role=any');
          expect(settings).not.toContain('role=zeta');
        });
      });
    },
  );

  given(
    '[case4] a `+omega::flow` delta actor, enrolled over [any, zeta, omega], then zeta leaves the repo (D1)',
    () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genSampleRepoWithRoles({
          slug: 'sync-delta-actors-focus',
          roles: [
            { repo: 'fixture', role: 'any' },
            { repo: 'fixture', role: 'zeta' },
            { repo: 'fixture', role: 'omega' },
          ],
        });
        const repoBrainDir = getBrainOndiskDir({
          actorDir: getOneRepoActorOndiskDir({ repoPath }),
        });
        mkdirSync(repoBrainDir, { recursive: true });
        writeFileSync(
          join(repoBrainDir, 'settings.of.repo.json'),
          JSON.stringify({
            hooks: {
              SessionStart: [
                asHookOfRole({ role: 'any' }),
                asHookOfRole({ role: 'zeta' }),
                asHookOfRole({ role: 'omega' }),
              ],
            },
          }),
        );
        const deltaActor = await findsertActorOndisk(
          {
            repoPath,
            brain: 'claude',
            roles: ['any', 'zeta', 'omega::flow'],
            rolesDelta: ['+omega::flow'],
            delta: '+omega::flow',
            reason: null,
            logEnrollment: false,
          },
          { repo: { ambient: { roles: ['any', 'zeta', 'omega'] } } },
        );
        return { repoPath, deltaActor };
      });

      when('[t0] the delta actors sync over [any, omega]', () => {
        const result = useBeforeAll(async () =>
          setDeltaActorsOndisk({
            repoPath: scene.repoPath,
            rolesLinked: ['any', 'omega'],
          }),
        );

        then('the actor drops zeta and keeps omega at its focus', () => {
          expect(result.failures).toEqual([]);
          expect(result.rederived).toHaveLength(1);
          expect([...result.rederived[0]!.after].sort()).toEqual([
            'any',
            'omega::flow',
          ]);
        });

        then('its actor.json holds the focus and keeps its delta', () => {
          const manifest = getOneActorManifest({
            repoPath: scene.repoPath,
            exid: scene.deltaActor.exid,
          });
          expect([...manifest.roles].sort()).toEqual(['any', 'omega::flow']);
          expect(manifest.rolesDelta).toEqual(['+omega::flow']);
        });

        then(
          "its settings keep all of omega's hooks — hooks follow the role, never the focus",
          () => {
            const settings = getOneActorSettings({
              repoPath: scene.repoPath,
              exid: scene.deltaActor.exid,
            });
            expect(settings).toContain('role=any');
            expect(settings).toContain('role=omega');
            expect(settings).not.toContain('role=zeta');
          },
        );
      });
    },
  );

  given(
    '[case5] a `-omega` delta actor, and the ambient record focuses zeta at flow',
    () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genSampleRepoWithRoles({
          slug: 'sync-delta-actors-record',
          roles: [
            { repo: 'fixture', role: 'any' },
            { repo: 'fixture', role: 'zeta' },
            { repo: 'fixture', role: 'omega' },
          ],
        });
        const repoBrainDir = getBrainOndiskDir({
          actorDir: getOneRepoActorOndiskDir({ repoPath }),
        });
        mkdirSync(repoBrainDir, { recursive: true });
        writeFileSync(join(repoBrainDir, 'settings.of.repo.json'), '{}');
        const deltaActor = await findsertActorOndisk(
          {
            repoPath,
            brain: 'claude',
            roles: ['any', 'zeta'],
            rolesDelta: ['-omega'],
            delta: '-omega',
            reason: null,
            logEnrollment: false,
          },
          { repo: { ambient: { roles: ['any', 'zeta', 'omega'] } } },
        );
        writeFileSync(
          getRepoAmbientRoleFociPath({ repoPath }),
          JSON.stringify({ zeta: ['flow'] }),
        );
        return { repoPath, deltaActor };
      });

      when('[t0] the delta actors sync over [any, zeta, omega]', () => {
        const result = useBeforeAll(async () =>
          setDeltaActorsOndisk({
            repoPath: scene.repoPath,
            rolesLinked: ['any', 'zeta', 'omega'],
          }),
        );

        then(
          'the actor inherits the recorded focus — the ambient set it stands on',
          () => {
            expect(result.failures).toEqual([]);
            expect(result.rederived).toHaveLength(1);
            expect([...result.rederived[0]!.after].sort()).toEqual([
              'any',
              'zeta::flow',
            ]);
          },
        );
      });
    },
  );

  given('[case6] a delta actor, and the ambient record is not json', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genSampleRepoWithRoles({
        slug: 'sync-delta-actors-corrupt',
        roles: [
          { repo: 'fixture', role: 'any' },
          { repo: 'fixture', role: 'zeta' },
          { repo: 'fixture', role: 'omega' },
        ],
      });
      const deltaActor = await findsertActorOndisk(
        {
          repoPath,
          brain: 'claude',
          roles: ['any', 'zeta'],
          rolesDelta: ['-omega'],
          delta: '-omega',
          reason: null,
          logEnrollment: false,
        },
        { repo: { ambient: { roles: ['any', 'zeta', 'omega'] } } },
      );
      const recordPath = getRepoAmbientRoleFociPath({ repoPath });
      mkdirSync(dirname(recordPath), { recursive: true });
      writeFileSync(recordPath, '{ not json');
      return { repoPath, deltaActor };
    });

    when('[t0] the delta actors sync', () => {
      const result = useBeforeAll(async () =>
        setDeltaActorsOndisk({
          repoPath: scene.repoPath,
          rolesLinked: ['any', 'omega'],
        }),
      );

      then(
        'one failure is collected for the sweep, never one per actor',
        () => {
          expect(result.rederived).toEqual([]);
          expect(result.failures).toHaveLength(1);
          expect(result.failures[0]!.scope).toEqual({ kind: 'actors' });
          expect(result.failures[0]!.cause.message).toContain(
            'ambient role foci record is not json',
          );
        },
      );

      then('the actor keeps the roles its record holds', () => {
        const manifest = getOneActorManifest({
          repoPath: scene.repoPath,
          exid: scene.deltaActor.exid,
        });
        expect(manifest.roles).toEqual(['any', 'zeta']);
      });
    });
  });
});
