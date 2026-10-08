import { getError, given, then, when } from 'test-fns';

import type { Role } from '@src/domain.objects/Role';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';

import { assertRegistryHooksNoRoleBoot } from './assertRegistryHooksNoRoleBoot';

const genRegistry = (roles: unknown[]): RoleRegistry =>
  ({ slug: 'test', roles: roles as Role[] }) as RoleRegistry;

describe('assertRegistryHooksNoRoleBoot', () => {
  given('[case1] a registry with no hooks', () => {
    when('[t0] the assertion runs', () => {
      then('it does not throw', () => {
        expect(() =>
          assertRegistryHooksNoRoleBoot({
            registry: genRegistry([{ slug: 'role1' }]),
          }),
        ).not.toThrow();
      });
    });
  });

  given(
    '[case2] a registry whose hooks boot a custom manifest or run a skill',
    () => {
      when('[t0] the assertion runs', () => {
        then('it does not throw', () => {
          expect(() =>
            assertRegistryHooksNoRoleBoot({
              registry: genRegistry([
                {
                  slug: 'behaver',
                  hooks: {
                    onBrain: {
                      onBoot: [
                        {
                          command:
                            './node_modules/.bin/rhachet roles boot --manifest .behavior/v1.x/boot.yml',
                          timeout: 'PT30S',
                        },
                        {
                          command:
                            './node_modules/.bin/rhachet run --repo bhrain --skill route.drive --when hook.onBoot',
                          timeout: 'PT30S',
                        },
                      ],
                    },
                  },
                },
              ]),
            }),
          ).not.toThrow();
        });
      });
    },
  );

  given('[case3] a registry whose roles boot themselves from a hook', () => {
    when('[t0] the assertion runs', () => {
      const registry = genRegistry([
        {
          slug: 'mechanic',
          hooks: {
            onBrain: {
              onBoot: [
                {
                  command:
                    './node_modules/.bin/rhachet roles boot --repo .this --role any --if-present',
                  timeout: 'PT60S',
                },
                {
                  command:
                    './node_modules/.bin/rhachet roles boot --repo ehmpathy --role mechanic',
                  timeout: 'PT60S',
                },
              ],
            },
          },
        },
        {
          slug: 'architect',
          hooks: {
            onBrain: {
              onBoot: [
                {
                  command:
                    './node_modules/.bin/rhachet roles boot --role architect',
                  timeout: 'PT60S',
                },
              ],
            },
          },
        },
      ]);

      then('it throws a ConstraintError that names every hook', async () => {
        const error = await getError(async () =>
          assertRegistryHooksNoRoleBoot({ registry }),
        );
        expect(error.message.startsWith('✋ ConstraintError: ')).toBe(true);
        expect(error.message).not.toContain('✋ ConstraintError: ✋');
        expect(error.message).toContain('mechanic');
        expect(error.message).toContain('architect');
        expect(error.message).toContain('onBrain.onBoot[0]');
        expect(error.message).toContain('onBrain.onBoot[1]');
        expect(error.message).toContain('--repo .this --role any');
      });

      then('the message matches snapshot', async () => {
        const error = await getError(async () =>
          assertRegistryHooksNoRoleBoot({ registry }),
        );
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
