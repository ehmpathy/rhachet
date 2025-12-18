import { UnexpectedCodePathError } from 'helpful-errors';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, when } from 'test-fns';

import { enrollThread } from './enrollThread';

describe('enrollThread', () => {
  given('a role with no traits or skills', () => {
    when('calling enrollThread()', () => {
      then('it should default traits and skills to empty arrays', async () => {
        const thread = await enrollThread({
          role: 'mechanic',
        });

        expect(thread.context.inherit.traits).toEqual([]);
        expect(thread.context.inherit.skills).toEqual([]);
      });
    });
  });

  given('a role with only traits provided', () => {
    const traitArtifact = genArtifactGitFile({
      uri: __dirname + '/.temp/traits.md',
    });
    const traitContent = '__trait__';
    beforeEach(() => traitArtifact.set({ content: traitContent }));

    when('calling enrollThread()', () => {
      then(
        'it should inject traits and still initialize skills as an empty array',
        async () => {
          const thread = await enrollThread({
            role: 'analyst',
            inherit: {
              traits: [traitArtifact],
            },
          });

          expect(thread.context.inherit.traits).toHaveLength(1);
          expect(thread.context.inherit.traits[0]?.content).toBeDefined();
          expect(thread.context.inherit.skills).toEqual([]);
        },
      );
    });
  });

  given('a role with only skills provided', () => {
    const skillArtifact = genArtifactGitFile({
      uri: __dirname + '/.temp/skills.md',
    });

    when('calling enrollThread()', () => {
      then(
        'it should throw since addRoleSkills is not yet implemented',
        async () => {
          await expect(
            enrollThread({
              role: 'operator',
              inherit: {
                skills: [skillArtifact],
              },
            }),
          ).rejects.toThrow(UnexpectedCodePathError);
        },
      );
    });
  });

  given('a role with both traits and stash', () => {
    const traitArtifact = genArtifactGitFile({
      uri: __dirname + '/.temp/traits.md',
    });
    const traitContent = '__trait__';

    beforeEach(() => traitArtifact.set({ content: traitContent }));

    when('calling enrollThread()', () => {
      then(
        'it should inject both stash and traits and ensure skills is []',
        async () => {
          const thread = await enrollThread({
            role: 'teacher',
            stash: {
              lesson: 'always explain the why',
            },
            inherit: {
              traits: [traitArtifact],
            },
          });

          expect(thread.context.stash.lesson).toBe('always explain the why');
          expect(thread.context.inherit.traits).toHaveLength(1);
          expect(thread.context.inherit.traits[0]!.content).toEqual(
            traitContent,
          );
          expect(thread.context.inherit.skills).toEqual([]);
        },
      );
    });
  });
});
