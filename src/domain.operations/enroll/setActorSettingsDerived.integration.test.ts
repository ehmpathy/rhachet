import { given, then, useBeforeAll, when } from 'test-fns';

import { genSampleHomeWithBrainDir } from '@src/.test/assets/genSampleHomeWithBrainDir';
import { genSampleSettingsOfRoles } from '@src/.test/assets/genSampleHookOfRole';
import { genSampleRepoWithRoles } from '@src/.test/assets/genSampleRepoWithRoles';
import { findsertActorOndisk } from '@src/domain.operations/actor/enrolled/findsertActorOndisk';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';

import {
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
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
        logEnrollment: false,
      },
      { repo: { ambient: { roles: ['any', 'zeta', 'omega'] } } },
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
            [...hooks.keys()].map((key) => key.split('|')[1]).sort();
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
          ).toEqual('.home/.claude/settings.json');
          expect(
            readlinkSync(
              join(scene.brainDir, '.home', '.claude', 'settings.json'),
            ),
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
});
