import { given, then, useBeforeAll, when } from 'test-fns';

import { genSampleHomeWithBrainDir } from '@src/.test/assets/genSampleHomeWithBrainDir';
import { genSampleHookDispatchRule } from '@src/.test/assets/genSampleHookDispatchRule';
import { genSampleSettingsOfRoles } from '@src/.test/assets/genSampleHookOfRole';
import { genSampleRepoWithRoles } from '@src/.test/assets/genSampleRepoWithRoles';
import { BrainHook } from '@src/domain.objects/BrainHook';
import { findsertActorOndisk } from '@src/domain.operations/actor/enrolled/findsertActorOndisk';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';
import { asHookUniqueKey } from '@src/domain.operations/brains/dispatch/asHookUniqueKey';
import { asSettingsWithHookDispatchers } from '@src/domain.operations/brains/dispatch/asSettingsWithHookDispatchers';
import { HOOK_DISPATCH } from '@src/domain.operations/brains/dispatch/constants';
import { getOneHookDispatchManifest } from '@src/domain.operations/brains/dispatch/getOneHookDispatchManifest';
import { setHookDispatchManifest } from '@src/domain.operations/brains/dispatch/setHookDispatchManifest';

import {
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { setActorSettingsDerived } from './setActorSettingsDerived';

const asSettingsOfRoles = genSampleSettingsOfRoles;

/**
 * .what = a repo over [any, zeta, omega] whose repo actor holds every role's hooks, an
 *   absolute `zeta` actor whose brain dir holds the blend (every role's hooks), and a temp
 *   home with a grove
 * .note = HOME points at the temp home for the span of the suite, so the grove arrow the
 *   layout writes never reaches the box's own `~/.claude`
 */
const useSceneOfBlendedActor = (input: {
  slug: string;
  claudeSettingsReal: string | null;
}) =>
  useBeforeAll(async () => {
    const repoPath = genSampleRepoWithRoles({
      slug: input.slug,
      roles: [
        { repo: 'fixture', role: 'any' },
        { repo: 'fixture', role: 'zeta' },
        { repo: 'fixture', role: 'omega' },
      ],
    });
    const { home } = genSampleHomeWithBrainDir({
      slug: `${input.slug}-home`,
      grove: '{}\n',
    });

    // the repo actor's settings.of.repo.json — the source every actor narrows from
    const repoBrainDir = getBrainOndiskDir({
      actorDir: getOneRepoActorOndiskDir({ repoPath }),
    });
    mkdirSync(repoBrainDir, { recursive: true });
    writeFileSync(
      join(repoBrainDir, 'settings.of.repo.json'),
      asSettingsOfRoles({ roles: ['any', 'zeta', 'omega'] }),
    );

    // an absolute actor over [zeta], whose brain dir still holds the blend
    const actor = await findsertActorOndisk(
      {
        repoPath,
        brain: 'claude',
        roles: ['zeta'],
        delta: 'zeta',
        reason: null,
        exidDeclared: null,
        logEnrollment: false,
      },
      {
        repo: {
          ambient: { exid: 'repo=ambient', roles: ['any', 'zeta', 'omega'] },
        },
      },
    );
    const brainDir = getBrainOndiskDir({
      actorDir: getActorOndiskDir({ repoPath, exid: actor.exid }),
    });
    mkdirSync(brainDir, { recursive: true });
    writeFileSync(
      join(brainDir, 'settings.of.repo.json'),
      asSettingsOfRoles({ roles: ['any', 'zeta', 'omega'] }),
    );
    if (input.claudeSettingsReal !== null)
      writeFileSync(join(brainDir, 'settings.json'), input.claudeSettingsReal);

    // derive, with HOME on the temp home
    const homeBefore = process.env.HOME;
    process.env.HOME = home;
    try {
      const result = await setActorSettingsDerived({ actor, repoPath });
      return { repoPath, home, brainDir, actor, result };
    } finally {
      process.env.HOME = homeBefore;
    }
  });

describe('setActorSettingsDerived', () => {
  given(
    '[case1] an absolute [zeta] actor whose settings.of.repo.json holds every role',
    () => {
      const scene = useSceneOfBlendedActor({
        slug: 'actor-settings-derived-blend',
        claudeSettingsReal: null,
      });

      when('[t0] its settings are derived', () => {
        then('the hooks before hold every role; after, zeta alone', () => {
          const authorsOf = (hooks: Map<string, string>) =>
            [...hooks.keys()]
              .map((key) => key.split('|')[BrainHook.unique.indexOf('author')])
              .sort();
          expect(authorsOf(scene.result.hooks.before)).toEqual([
            'repo=fixture/role=any',
            'repo=fixture/role=omega',
            'repo=fixture/role=zeta',
          ]);
          expect(authorsOf(scene.result.hooks.after)).toEqual([
            'repo=fixture/role=zeta',
          ]);
        });

        then('its settings.of.repo.json holds the zeta hook alone', () => {
          const settings = readFileSync(
            join(scene.brainDir, 'settings.of.repo.json'),
            'utf8',
          );
          expect(settings).toContain('role=zeta');
          expect(settings).not.toContain('role=any');
          expect(settings).not.toContain('role=omega');
        });

        then('the layout links claude’s name to the grove of the home', () => {
          expect(readlinkSync(join(scene.brainDir, 'settings.json'))).toEqual(
            'settings.of.grove.json',
          );
          expect(
            readlinkSync(join(scene.brainDir, 'settings.of.grove.json')),
          ).toEqual(join(scene.home, '.claude', 'settings.json'));
        });

        then('no settings file was kept aside', () => {
          expect(
            readdirSync(scene.brainDir).filter((name) =>
              name.includes('.forked.'),
            ),
          ).toEqual([]);
        });
      });
    },
  );

  given(
    '[case2] the same actor, whose brain dir holds a real settings.json (a fork of the grove)',
    () => {
      const scene = useSceneOfBlendedActor({
        slug: 'actor-settings-derived-fork',
        claudeSettingsReal: JSON.stringify({ model: 'haiku' }),
      });

      when('[t0] its settings are derived', () => {
        then('the real settings.json is replaced, never kept aside', () => {
          expect(
            readdirSync(scene.brainDir).filter((name) =>
              name.includes('.forked.'),
            ),
          ).toEqual([]);
          expect(
            readFileSync(join(scene.brainDir, 'settings.of.repo.json'), 'utf8'),
          ).not.toContain('haiku');
        });

        then('claude’s name is an arrow to the grove again', () => {
          expect(readlinkSync(join(scene.brainDir, 'settings.json'))).toEqual(
            'settings.of.grove.json',
          );
        });

        then('the hooks are narrowed all the same', () => {
          const settings = readFileSync(
            join(scene.brainDir, 'settings.of.repo.json'),
            'utf8',
          );
          expect(settings).toContain('role=zeta');
          expect(settings).not.toContain('role=any');
        });
      });
    },
  );

  given(
    '[case3] an absolute [zeta] actor on the hook dispatcher, whose manifest still holds every role',
    () => {
      // the re-derive `rhx init --hooks` runs per actor (syncHooksForLinkedRoles): the rules live
      //   in the repo actor's manifest, so the narrow must land in the actor's own manifest, and a
      //   role the actor dropped must leave it (rhachet#764, r010 blocker.3)
      const scene = useBeforeAll(async () => {
        const repoPath = genSampleRepoWithRoles({
          slug: 'actor-settings-derived-dispatched',
          roles: [
            { repo: 'fixture', role: 'any' },
            { repo: 'fixture', role: 'zeta' },
            { repo: 'fixture', role: 'omega' },
          ],
        });
        const { home } = genSampleHomeWithBrainDir({
          slug: 'actor-settings-derived-dispatched-home',
          grove: '{}\n',
        });
        const rulesAll = ['any', 'zeta', 'omega'].map((role) =>
          genSampleHookDispatchRule({
            author: `repo=fixture/role=${role}`,
            command: `echo ${role}`,
          }),
        );

        // the repo actor: one dispatcher per event, every role's rule in its manifest
        const repoBrainDir = getBrainOndiskDir({
          actorDir: getOneRepoActorOndiskDir({ repoPath }),
        });
        const repoManifestPath = join(repoBrainDir, HOOK_DISPATCH.manifest);
        await setHookDispatchManifest({
          path: repoManifestPath,
          rules: rulesAll,
        });
        const settingsOfRepoActor = asSettingsWithHookDispatchers({
          settings: {},
          rules: rulesAll,
          manifestPathRel: relative(repoPath, repoManifestPath),
        });
        writeFileSync(
          join(repoBrainDir, 'settings.of.repo.json'),
          JSON.stringify(settingsOfRepoActor, null, 2),
        );

        // an actor over [zeta] whose manifest and settings predate the narrow
        const actor = await findsertActorOndisk(
          {
            repoPath,
            brain: 'claude',
            roles: ['zeta'],
            delta: 'zeta',
            reason: null,
            logEnrollment: false,
          },
          { repo: { ambient: { roles: ['any', 'zeta', 'omega'] } } },
        );
        const brainDir = getBrainOndiskDir({
          actorDir: getActorOndiskDir({ repoPath, exid: actor.exid }),
        });
        mkdirSync(brainDir, { recursive: true });
        await setHookDispatchManifest({
          path: join(brainDir, HOOK_DISPATCH.manifest),
          rules: rulesAll,
        });
        writeFileSync(
          join(brainDir, 'settings.of.repo.json'),
          JSON.stringify(settingsOfRepoActor, null, 2),
        );

        // derive, with HOME on the temp home
        const homeBefore = process.env.HOME;
        process.env.HOME = home;
        try {
          const result = await setActorSettingsDerived({ actor, repoPath });
          return { repoPath, brainDir, repoManifestPath, result };
        } finally {
          process.env.HOME = homeBefore;
        }
      });

      when('[t0] its settings are derived', () => {
        then('the hooks before hold every role; after, zeta alone', () => {
          const authorsOf = (hooks: Map<string, string>) =>
            [...hooks.keys()]
              .map((key) => key.split('|')[BrainHook.unique.indexOf('author')])
              .sort();
          expect(authorsOf(scene.result.hooks.before)).toEqual([
            'repo=fixture/role=any',
            'repo=fixture/role=omega',
            'repo=fixture/role=zeta',
          ]);
          expect(authorsOf(scene.result.hooks.after)).toEqual([
            'repo=fixture/role=zeta',
          ]);
        });

        then("the actor's manifest drops the roles it lacks", async () => {
          const manifest = await getOneHookDispatchManifest({
            path: join(scene.brainDir, HOOK_DISPATCH.manifest),
          });
          expect(manifest?.rules.map((rule) => rule.author)).toEqual([
            'repo=fixture/role=zeta',
          ]);
        });

        then("the actor's dispatcher names the actor's own manifest", () => {
          const settings = readFileSync(
            join(scene.brainDir, 'settings.of.repo.json'),
            'utf8',
          );
          expect(settings).toContain(HOOK_DISPATCH.author);
          expect(settings).toContain(
            relative(
              scene.repoPath,
              join(scene.brainDir, HOOK_DISPATCH.manifest),
            ),
          );
          expect(settings).not.toContain(
            relative(scene.repoPath, scene.repoManifestPath),
          );
        });

        then("the repo actor's manifest stays as it was", async () => {
          const manifest = await getOneHookDispatchManifest({
            path: scene.repoManifestPath,
          });
          expect(manifest?.rules).toHaveLength(3);
        });
      });
    },
  );

  given(
    '[case4] an actor still on per-rule hooks, moved onto the dispatcher (timeouts in seconds)',
    () => {
      // the published claude adapter writes a hook timeout in seconds; the manifest holds seconds.
      //   a role hook that moves into the manifest keeps its body, so the move reports no change
      const scene = useBeforeAll(async () => {
        const repoPath = genSampleRepoWithRoles({
          slug: 'actor-settings-derived-moved',
          roles: [{ repo: 'fixture', role: 'zeta' }],
        });
        const { home } = genSampleHomeWithBrainDir({
          slug: 'actor-settings-derived-moved-home',
          grove: '{}\n',
        });
        const rule = genSampleHookDispatchRule({
          event: 'SessionStart',
          matcher: '*',
          timeoutSeconds: 25,
          author: 'repo=fixture/role=zeta',
          command: 'echo zeta',
        });

        // the repo actor, synced to the dispatcher
        const repoBrainDir = getBrainOndiskDir({
          actorDir: getOneRepoActorOndiskDir({ repoPath }),
        });
        const repoManifestPath = join(repoBrainDir, HOOK_DISPATCH.manifest);
        await setHookDispatchManifest({
          path: repoManifestPath,
          rules: [rule],
        });
        writeFileSync(
          join(repoBrainDir, 'settings.of.repo.json'),
          JSON.stringify(
            asSettingsWithHookDispatchers({
              settings: {},
              rules: [rule],
              manifestPathRel: relative(repoPath, repoManifestPath),
            }),
          ),
        );

        // the actor, still on the per-rule hook the adapter wrote
        const actor = await findsertActorOndisk(
          {
            repoPath,
            brain: 'claude',
            roles: ['zeta'],
            delta: 'zeta',
            reason: null,
            logEnrollment: false,
          },
          { repo: { ambient: { roles: ['zeta'] } } },
        );
        const brainDir = getBrainOndiskDir({
          actorDir: getActorOndiskDir({ repoPath, exid: actor.exid }),
        });
        mkdirSync(brainDir, { recursive: true });
        rmSync(join(brainDir, HOOK_DISPATCH.manifest), { force: true }); // a per-rule actor holds no manifest
        writeFileSync(
          join(brainDir, 'settings.of.repo.json'),
          JSON.stringify({
            hooks: {
              SessionStart: [
                {
                  matcher: '*',
                  hooks: [
                    {
                      type: 'command',
                      command: 'echo zeta',
                      timeout: 25,
                      author: 'repo=fixture/role=zeta',
                    },
                  ],
                },
              ],
            },
          }),
        );

        // derive, with HOME on the temp home
        const homeBefore = process.env.HOME;
        process.env.HOME = home;
        try {
          return { result: await setActorSettingsDerived({ actor, repoPath }) };
        } finally {
          process.env.HOME = homeBefore;
        }
      });

      when('[t0] its settings are derived', () => {
        then('the moved hook keeps its body, so it reads as unchanged', () => {
          const key = asHookUniqueKey({
            hook: {
              author: 'repo=fixture/role=zeta',
              event: 'SessionStart',
              command: 'echo zeta',
            },
          });
          expect(scene.result.hooks.before.get(key)).toEqual(
            JSON.stringify({ matcher: '*', timeout: 25 }),
          );
          expect(scene.result.hooks.after.get(key)).toEqual(
            scene.result.hooks.before.get(key),
          );
        });
      });
    },
  );
});
