import { MalfunctionError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genSampleHomeWithBrainDir } from '@src/.test/assets/genSampleHomeWithBrainDir';

import {
  readdirSync,
  readFileSync,
  readlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { setBrainDirSettingsLayout } from './setBrainDirSettingsLayout';
import { withBrainDirSettingsShield } from './withBrainDirSettingsShield';

const GROVE_CONTENT = `${JSON.stringify({ theme: 'dark' }, null, 2)}\n`;
const REPO_CONTENT = `${JSON.stringify({ permissions: { allow: ['Bash(ls)'] } }, null, 2)}\n`;

/**
 * .what = a temp home with a grove, and a brain dir in the layout with a repo settings file
 */
const genScene = async (input: { slug: string }) => {
  const { repoPath, home, brainDir } = genSampleHomeWithBrainDir({
    slug: input.slug,
    grove: GROVE_CONTENT,
  });
  writeFileSync(join(brainDir, 'settings.of.repo.json'), REPO_CONTENT);
  await setBrainDirSettingsLayout({ repoPath, brainDir, home });
  return { repoPath, home, brainDir };
};

describe('withBrainDirSettingsShield', () => {
  given(
    '[case1] a writer that predates the layout: it writes settings.json by name',
    () => {
      const scene = useBeforeAll(async () => {
        const { repoPath, home, brainDir } = await genScene({
          slug: 'shield-legacy-writer',
        });
        await withBrainDirSettingsShield(
          { repoPath, brainDir, home },
          async () => {
            const pathClaude = join(brainDir, 'settings.json');
            const prior = JSON.parse(readFileSync(pathClaude, 'utf8'));
            writeFileSync(
              pathClaude,
              JSON.stringify({ ...prior, hooks: { Stop: [] } }, null, 2),
            );
          },
        );
        return { home, brainDir };
      });

      when('[t0] the shield closes', () => {
        then('the home settings are byte-identical', () => {
          expect(
            readFileSync(join(scene.home, '.claude', 'settings.json'), 'utf8'),
          ).toEqual(GROVE_CONTENT);
        });

        then(
          'the write lands in settings.of.repo.json, atop the repo keys',
          () => {
            expect(
              JSON.parse(
                readFileSync(
                  join(scene.brainDir, 'settings.of.repo.json'),
                  'utf8',
                ),
              ),
            ).toEqual({
              permissions: { allow: ['Bash(ls)'] },
              hooks: { Stop: [] },
            });
          },
        );

        then("claude's settings.json is the arrow again", () => {
          expect(readlinkSync(join(scene.brainDir, 'settings.json'))).toEqual(
            'settings.of.grove.json',
          );
        });

        then('no file is kept aside', () => {
          expect(
            readdirSync(scene.brainDir).filter((name) =>
              name.includes('.forked.'),
            ),
          ).toEqual([]);
        });
      });
    },
  );

  given('[case2] a current writer: it writes settings.of.repo.json', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = await genScene({
        slug: 'shield-current-writer',
      });
      await withBrainDirSettingsShield(
        { repoPath, brainDir, home },
        async () => {
          writeFileSync(
            join(brainDir, 'settings.of.repo.json'),
            `${JSON.stringify({ hooks: { Stop: [] } }, null, 2)}\n`,
          );
        },
      );
      return { home, brainDir };
    });

    when('[t0] the shield closes', () => {
      then("the writer's settings.of.repo.json stands as written", () => {
        expect(
          JSON.parse(
            readFileSync(join(scene.brainDir, 'settings.of.repo.json'), 'utf8'),
          ),
        ).toEqual({ hooks: { Stop: [] } });
      });

      then('the home settings are byte-identical', () => {
        expect(
          readFileSync(join(scene.home, '.claude', 'settings.json'), 'utf8'),
        ).toEqual(GROVE_CONTENT);
      });

      then("claude's settings.json is the arrow again", () => {
        expect(readlinkSync(join(scene.brainDir, 'settings.json'))).toEqual(
          'settings.of.grove.json',
        );
      });
    });
  });

  given('[case3] a writer that throws', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = await genScene({
        slug: 'shield-writer-throws',
      });
      const error = await withBrainDirSettingsShield(
        { repoPath, brainDir, home },
        async () => {
          throw new MalfunctionError('adapter fault');
        },
      ).catch((caught: unknown) => caught);
      return { home, brainDir, error };
    });

    when('[t0] the shield closes', () => {
      then('the error propagates', () => {
        // the same error, by identity of class and text — never a rewrap
        expect(scene.error).toBeInstanceOf(MalfunctionError);
        expect((scene.error as Error).message).toContain('adapter fault');
      });

      then('the layout is restored, repo settings intact', () => {
        expect(readlinkSync(join(scene.brainDir, 'settings.json'))).toEqual(
          'settings.of.grove.json',
        );
        expect(
          readFileSync(join(scene.brainDir, 'settings.of.repo.json'), 'utf8'),
        ).toEqual(REPO_CONTENT);
      });
    });
  });

  given('[case4] a writer that leaves settings.json as broken json', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = await genScene({
        slug: 'shield-writer-broken',
      });
      const error = await withBrainDirSettingsShield(
        { repoPath, brainDir, home },
        async () => {
          writeFileSync(join(brainDir, 'settings.json'), '{ "hooks": ');
        },
      ).catch((caught: unknown) => caught);
      return { home, brainDir, error };
    });

    when('[t0] the shield closes', () => {
      then('it fails loud, so the lost write is never silent', () => {
        expect(scene.error).toBeInstanceOf(MalfunctionError);
        expect((scene.error as Error).message).toContain(
          'json that is not an object',
        );
      });

      then('the repo settings are untouched', () => {
        expect(
          readFileSync(join(scene.brainDir, 'settings.of.repo.json'), 'utf8'),
        ).toEqual(REPO_CONTENT);
      });

      then("the writer's bytes are replaced, never kept aside", () => {
        expect(
          readdirSync(scene.brainDir).filter((name) =>
            name.includes('.forked.'),
          ),
        ).toEqual([]);
      });

      then("claude's settings.json is the arrow again", () => {
        expect(readlinkSync(join(scene.brainDir, 'settings.json'))).toEqual(
          'settings.of.grove.json',
        );
      });
    });
  });
});
