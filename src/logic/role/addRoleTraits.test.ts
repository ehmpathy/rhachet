import { withExpectOutput } from 'as-procedure';
import { UnexpectedCodePathError } from 'helpful-errors';
import { Artifact } from 'rhachet-artifact';
import { GitFile } from 'rhachet-artifact-git';
import { given, when, then } from 'test-fns';

import { RoleContextTrait } from '../../domain/objects/RoleContext';
import { addRoleTraits } from './addRoleTraits';

const makeFakeArtifact = (content: string): Artifact<typeof GitFile> => ({
  ref: { uri: `/fake/${Math.random()}` },
  get: withExpectOutput(async () => ({
    uri: '/fake/file.md',
    hash: 'hash123',
    content,
  })),
  set: () => UnexpectedCodePathError.throw('todo'),
  del: () => UnexpectedCodePathError.throw('todo'),
});

describe('addRoleTraits', () => {
  given('a thread with empty traits', () => {
    const thread = {
      context: { inherit: { traits: [], skills: [] } },
      stitches: [],
    };

    when('adding traits from direct RoleTrait content', () => {
      const traits: RoleContextTrait[] = [
        { content: 'treat consistency as top priority' },
        { content: 'prefer ubiquitous language' },
      ];

      then('should append those traits to the context', async () => {
        const updated = await addRoleTraits({ thread, from: { traits } });
        expect(updated.context.inherit.traits).toEqual(traits);
      });
    });

    when('adding traits from GitFile artifacts', () => {
      const artifacts = [
        makeFakeArtifact('treat consistency as top priority'),
        makeFakeArtifact('prefer given/when/then structure'),
      ];

      then('should extract and append traits from files', async () => {
        const updated = await addRoleTraits({ thread, from: { artifacts } });
        expect(updated.context.inherit.traits).toEqual([
          { content: 'treat consistency as top priority' },
          { content: 'prefer given/when/then structure' },
        ]);
      });
    });

    when('adding traits from both RoleTrait and Artifact', () => {
      const traits: RoleContextTrait[] = [{ content: 'always test behavior' }];
      const artifacts = [makeFakeArtifact('capture domain terms')];

      then(
        'should merge both sources into context.inherit.traits',
        async () => {
          const updated = await addRoleTraits({
            thread,
            from: { traits, artifacts },
          });
          expect(updated.context.inherit.traits).toEqual([
            { content: 'always test behavior' },
            { content: 'capture domain terms' },
          ]);
        },
      );
    });
  });

  given('a thread with pre-existing traits', () => {
    const thread = {
      context: {
        inherit: {
          traits: [{ content: 'existing trait' }],
          skills: [],
        },
      },
      stitches: [],
    };

    when('adding new traits via artifact', () => {
      const artifacts = [makeFakeArtifact('new trait added')];

      then('should preserve existing traits and append new ones', async () => {
        const updated = await addRoleTraits({ thread, from: { artifacts } });
        expect(updated.context.inherit.traits).toEqual([
          { content: 'existing trait' },
          { content: 'new trait added' },
        ]);
      });
    });
  });

  given('an invalid input with neither traits nor artifacts', () => {
    const thread = {
      context: { inherit: { traits: [], skills: [] } },
      stitches: [],
    };

    then('should fail at type level', async () => {
      // @ts-expect-error — atleast one key in from is required
      await addRoleTraits({ thread, from: {} });
    });
  });
});
