import { MalfunctionError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { genSampleHomeWithBrainDir } from '@src/.test/assets/genSampleHomeWithBrainDir';

import {
  readdirSync,
  readFileSync,
  readlinkSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { BrainDirOutsideRepoError } from './BrainDirOutsideRepoError';
import { setBrainDirSettingsLayout } from './setBrainDirSettingsLayout';
import { withBrainDirSettingsShield } from './withBrainDirSettingsShield';

const GROVE_CONTENT = `${JSON.stringify({ theme: 'dark' }, null, 2)}\n`;
const REPO_CONTENT = `${JSON.stringify({ permissions: { allow: ['Bash(ls)'] } }, null, 2)}\n`;

/**
 * .what = a temp home with a grove, and a brain dir in the layout with a repo settings file
 * .why = every case starts from one known layout, so each asserts only what its writer changed
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
      const thrown = new MalfunctionError('adapter fault');
      const error = await getError(
        withBrainDirSettingsShield({ repoPath, brainDir, home }, async () => {
          throw thrown;
        }),
      );
      return { home, brainDir, error, thrown };
    });

    when('[t0] the shield closes', () => {
      then('the error propagates, the same instance — never a rewrap', () => {
        expect(scene.error).toBe(scene.thrown);
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

  given('[case4] a writer that throws before its first await', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = await genScene({
        slug: 'shield-writer-throws-sync',
      });
      // a writer typed to return a promise, which throws in its body before any promise exists
      const thrown = new MalfunctionError('adapter fault, sync');
      const writerSync = (): Promise<void> => {
        throw thrown;
      };
      const error = await getError(
        withBrainDirSettingsShield({ repoPath, brainDir, home }, writerSync),
      );
      return { brainDir, error, thrown };
    });

    when('[t0] the shield closes', () => {
      then('the error propagates, the same instance — never a rewrap', () => {
        expect(scene.error).toBe(scene.thrown);
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

  given('[case5] a writer that leaves settings.json as broken json', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = await genScene({
        slug: 'shield-writer-broken',
      });
      const error = await getError(
        withBrainDirSettingsShield({ repoPath, brainDir, home }, async () => {
          writeFileSync(join(brainDir, 'settings.json'), '{ "hooks": ');
        }),
      );
      return { home, brainDir, error };
    });

    when('[t0] the shield closes', () => {
      then('it fails loud, so the lost write is never silent', () => {
        expect(scene.error).toBeInstanceOf(MalfunctionError);
        expect(scene.error.message).toContain('json that is not an object');
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

  given(
    '[case6] a writer that rejects with a value that is not an Error',
    () => {
      const scene = useBeforeAll(async () => {
        const { repoPath, home, brainDir } = await genScene({
          slug: 'shield-writer-rejects-string',
        });
        const error = await getError(
          withBrainDirSettingsShield({ repoPath, brainDir, home }, () =>
            Promise.reject('EACCES from the adapter'),
          ),
        );
        if (!(error instanceof MalfunctionError)) throw error;
        return { brainDir, error };
      });

      when('[t0] the shield closes', () => {
        then('it fails loud as a MalfunctionError that names the value', () => {
          expect(scene.error.message).toContain(
            'the settings writer rejected with a value that is not an Error',
          );
          expect(scene.error.metadata?.reason).toEqual(
            'EACCES from the adapter',
          );
        });

        then('the human reads the same header and hint', () => {
          expect({
            header: scene.error.message.split('\n')[0],
            hint: scene.error.metadata?.hint,
          }).toMatchSnapshot();
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
    },
  );

  given(
    '[case7] a brain dir not yet made, under a parent that links outside the repo',
    () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genTempDir({ slug: 'shield-linked-out' });
        const home = genTempDir({ slug: 'shield-linked-out-home' });
        const outside = genTempDir({ slug: 'shield-linked-out-target' });
        symlinkSync(outside, join(repoPath, 'brain'));
        const brainDir = join(repoPath, 'brain', '.claude');

        // a spy over a real write, not a mock: the empty outside dir proves no write landed,
        //   and the spy proves the shield refused before it even called the writer
        const writer = jest.fn(async () => {
          writeFileSync(join(brainDir, 'settings.json'), '{}');
        });
        const error = await getError(
          withBrainDirSettingsShield({ repoPath, brainDir, home }, writer),
        );
        return { outside, writer, error };
      });

      when('[t0] the shield opens', () => {
        then('it refuses with BrainDirOutsideRepoError', () => {
          expect(scene.error).toBeInstanceOf(BrainDirOutsideRepoError);
        });

        then('the writer never runs', () => {
          expect(scene.writer).not.toHaveBeenCalled();
        });

        then('the outside dir stays empty: no brain dir was made there', () => {
          expect(readdirSync(scene.outside)).toEqual([]);
        });
      });
    },
  );
});
