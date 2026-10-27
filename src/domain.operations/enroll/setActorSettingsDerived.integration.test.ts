import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genSampleHomeWithBrainDir } from '@src/.test/assets/genSampleHomeWithBrainDir';
import { genSampleSettingsOfRoles } from '@src/.test/assets/genSampleHookOfRole';
import { genSampleRepoWithRoles } from '@src/.test/assets/genSampleRepoWithRoles';
import { findsertActorOndisk } from '@src/domain.operations/actor/enrolled/findsertActorOndisk';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';

import {
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  symlinkSync,
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
const genSceneOfBlendedActor = async (input: {
  slug: string;
  claudeSettingsReal: string | null;
  repoSettingsShape: 'file' | 'dir' | 'symlink';
}) => {
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

  // an absolute actor over [zeta], whose brain dir still holds the blend — as a file, or, for
  //   the refusal cases, a dir or a symlink at that name
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
  const repoSettingsPath = join(brainDir, 'settings.of.repo.json');
  const repoSettingsContent = asSettingsOfRoles({
    roles: ['any', 'zeta', 'omega'],
  });
  if (input.repoSettingsShape === 'file')
    writeFileSync(repoSettingsPath, repoSettingsContent);
  if (input.repoSettingsShape === 'dir') mkdirSync(repoSettingsPath);
  if (input.repoSettingsShape === 'symlink') {
    writeFileSync(join(brainDir, 'elsewhere.json'), repoSettingsContent);
    symlinkSync('elsewhere.json', repoSettingsPath);
  }
  if (input.claudeSettingsReal !== null)
    writeFileSync(join(brainDir, 'settings.json'), input.claudeSettingsReal);
  return { repoPath, home, brainDir, actor };
};

/**
 * .what = the blended actor scene alone, for a case whose act runs in its when
 */
const useSceneOfBlendedActorShaped = (input: {
  slug: string;
  claudeSettingsReal: string | null;
  repoSettingsShape: 'file' | 'dir' | 'symlink';
}) => useBeforeAll(async () => genSceneOfBlendedActor(input));

/**
 * .what = derive the actor's settings with HOME on the temp home, once, and return the refusal
 * .note = call inside a when: the act is the when's, and its thens share the one result
 */
const useThenDeriveRefused = (input: {
  scene: Awaited<ReturnType<typeof genSceneOfBlendedActor>>;
}) =>
  useThen('the derive settles', async () => {
    const homeBefore = process.env.HOME;
    process.env.HOME = input.scene.home;
    try {
      const error = await getError(
        setActorSettingsDerived({
          actor: input.scene.actor,
          repoPath: input.scene.repoPath,
        }),
      );
      if (!(error instanceof ConstraintError))
        throw new MalfunctionError(
          'expected the settings layout to refuse, but the derive did not',
          { cause: error },
        );
      return { error };
    } finally {
      process.env.HOME = homeBefore;
    }
  });

const useSceneOfBlendedActor = (input: {
  slug: string;
  claudeSettingsReal: string | null;
}) =>
  useBeforeAll(async () => {
    const scene = await genSceneOfBlendedActor({
      ...input,
      repoSettingsShape: 'file',
    });

    // derive, with HOME on the temp home
    const homeBefore = process.env.HOME;
    process.env.HOME = scene.home;
    try {
      const result = await setActorSettingsDerived({
        actor: scene.actor,
        repoPath: scene.repoPath,
      });
      return { ...scene, result };
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

  given('[case3] the same actor, whose settings.of.repo.json is a dir', () => {
    const scene = useSceneOfBlendedActorShaped({
      slug: 'actor-settings-derived-dir',
      claudeSettingsReal: null,
      repoSettingsShape: 'dir',
    });

    when('[t0] its settings are derived', () => {
      const derived = useThenDeriveRefused({ scene });

      then('the layout refuses with its fix, never a raw EISDIR', () => {
        expect(derived.error).toBeInstanceOf(ConstraintError);
        expect(derived.error.message.split('\n')[0]).toEqual(
          '✋ ConstraintError: settings.of.repo.json must be a real file',
        );
        expect(derived.error.message).not.toContain('EISDIR');
        expect(derived.error.metadata?.found).toEqual('a dir');
      });

      then('the dir stays a dir: the refusal precedes every write', () => {
        expect(
          lstatSync(
            join(scene.brainDir, 'settings.of.repo.json'),
          ).isDirectory(),
        ).toBe(true);
      });

      then('no settings.json and no grove arrow was made', () => {
        expect(readdirSync(scene.brainDir)).not.toContain('settings.json');
        expect(readdirSync(scene.brainDir)).not.toContain(
          'settings.of.grove.json',
        );
      });
    });
  });

  given(
    '[case4] the same actor, whose settings.of.repo.json is a symlink',
    () => {
      const scene = useSceneOfBlendedActorShaped({
        slug: 'actor-settings-derived-symlink',
        claudeSettingsReal: null,
        repoSettingsShape: 'symlink',
      });

      when('[t0] its settings are derived', () => {
        const derived = useThenDeriveRefused({ scene });

        then('the layout refuses with its fix, and names the link', () => {
          expect(derived.error).toBeInstanceOf(ConstraintError);
          expect(derived.error.message.split('\n')[0]).toEqual(
            '✋ ConstraintError: settings.of.repo.json must be a real file',
          );
          expect(derived.error.metadata?.found).toEqual(
            'a symlink to elsewhere.json',
          );
        });

        then('the link and the file it reaches are untouched', () => {
          expect(
            readlinkSync(join(scene.brainDir, 'settings.of.repo.json')),
          ).toEqual('elsewhere.json');
          expect(
            readFileSync(join(scene.brainDir, 'elsewhere.json'), 'utf8'),
          ).toContain('role=omega');
        });

        then('no settings.json and no grove arrow was made', () => {
          expect(readdirSync(scene.brainDir)).not.toContain('settings.json');
          expect(readdirSync(scene.brainDir)).not.toContain(
            'settings.of.grove.json',
          );
        });
      });
    },
  );
});
