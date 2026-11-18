import { given, then, when } from 'test-fns';

import { Role } from '@src/domain.objects/Role';

import { asHookCommandsOfRegistryRole } from './asHookCommandsOfRegistryRole';

/**
 * .what = a role of the surf registry, with the given hooks
 */
const genRole = (input: { slug: string; hooks: Role['hooks'] }): Role =>
  new Role({
    slug: input.slug,
    name: input.slug,
    purpose: 'ride waves',
    readme: { uri: `/surf/${input.slug}/readme.md` },
    traits: [],
    briefs: { dirs: [] },
    skills: { dirs: [], refs: [] },
    hooks: input.hooks,
  });

const registry = {
  slug: 'surf',
  roles: [
    genRole({
      slug: 'surfer',
      hooks: {
        onBrain: {
          onBoot: [{ command: 'rhx wax.board', timeout: 'PT30S' }],
          onStop: [
            {
              command: './.agent/repo=surf/role=surfer/skills/rinse.sh',
              timeout: 'PT30S',
            },
          ],
        },
      },
    }),
    genRole({ slug: 'lifeguard', hooks: undefined }),
  ],
};

describe('asHookCommandsOfRegistryRole', () => {
  given('[case1] a registry whose role declares hooks', () => {
    when('[t0] the commands of a hooked role are read', () => {
      then('every command on every event is returned', () => {
        expect(
          asHookCommandsOfRegistryRole({ registry, role: 'surfer' }),
        ).toEqual({
          commands: [
            'rhx wax.board',
            './.agent/repo=surf/role=surfer/skills/rinse.sh',
          ],
          error: null,
        });
      });
    });

    when('[t1] the commands of a role with no hooks are read', () => {
      then('the list is empty, and no error is returned', () => {
        expect(
          asHookCommandsOfRegistryRole({ registry, role: 'lifeguard' }),
        ).toEqual({ commands: [], error: null });
      });
    });

    when('[t2] the commands of a role the registry lacks are read', () => {
      then('an error names the role, never an empty list', () => {
        const result = asHookCommandsOfRegistryRole({ registry, role: 'kook' });
        expect(result.commands).toEqual(null);
        expect(result.error?.message).toContain('role kook not found');
      });
    });
  });
});
