import { getError, given, then, when } from 'test-fns';

import type { Role } from '@src/domain.objects/Role';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';

import { assertRegistryHooksNoNpx } from './assertRegistryHooksNoNpx';

describe('assertRegistryHooksNoNpx', () => {
  given('[case1] registry with no hooks', () => {
    when('[t0] assertion is called', () => {
      then('does not throw', () => {
        expect(() =>
          assertRegistryHooksNoNpx({
            registry: {
              slug: 'test',
              roles: [{ slug: 'role1' }] as unknown as Role[],
            } as RoleRegistry,
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] registry with valid hooks', () => {
    when('[t0] assertion is called', () => {
      then('does not throw', () => {
        expect(() =>
          assertRegistryHooksNoNpx({
            registry: {
              slug: 'test',
              roles: [
                {
                  slug: 'mechanic',
                  hooks: {
                    onBrain: {
                      onBoot: [
                        {
                          command:
                            './node_modules/.bin/rhachet roles boot --role mechanic',
                          timeout: 'PT60S',
                        },
                      ],
                    },
                  },
                },
              ] as unknown as Role[],
            } as RoleRegistry,
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case3] registry with forbidden npx rhachet hook', () => {
    when('[t0] assertion is called', () => {
      then('throws BadRequestError with treestruct message', async () => {
        const error = await getError(async () =>
          assertRegistryHooksNoNpx({
            registry: {
              slug: 'test',
              roles: [
                {
                  slug: 'mechanic',
                  hooks: {
                    onBrain: {
                      onBoot: [
                        {
                          command: 'npx rhachet roles boot --role mechanic',
                          timeout: 'PT120S',
                        },
                      ],
                    },
                  },
                },
              ] as unknown as Role[],
            } as RoleRegistry,
          }),
        );
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('✋ hooks with forbidden npx patterns');
        expect(error.message).toContain('mechanic');
        expect(error.message).toContain('onBrain.onBoot[0]');
        expect(error.message).toContain(
          'npx rhachet roles boot --role mechanic',
        );
        expect(error.message).toContain('./node_modules/.bin/rhachet');
      });
    });
  });

  given('[case4] registry with multiple violations', () => {
    when('[t0] assertion is called', () => {
      then('includes all violations in error message', async () => {
        const error = await getError(async () =>
          assertRegistryHooksNoNpx({
            registry: {
              slug: 'test',
              roles: [
                {
                  slug: 'mechanic',
                  hooks: {
                    onBrain: {
                      onBoot: [
                        {
                          command: 'npx rhachet roles boot --role mechanic',
                          timeout: 'PT120S',
                        },
                      ],
                    },
                  },
                },
                {
                  slug: 'architect',
                  hooks: {
                    onBrain: {
                      onTool: [
                        {
                          command: 'npx rhx some-skill',
                          timeout: 'PT60S',
                        },
                      ],
                    },
                  },
                },
              ] as unknown as Role[],
            } as RoleRegistry,
          }),
        );
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('mechanic');
        expect(error.message).toContain('architect');
        expect(error.message).toContain('onBrain.onBoot[0]');
        expect(error.message).toContain('onBrain.onTool[0]');
      });
    });
  });

  given('[case5] error message snapshot', () => {
    when('[t0] assertion is called with forbidden hook', () => {
      then('error message matches snapshot', async () => {
        const error = await getError(async () =>
          assertRegistryHooksNoNpx({
            registry: {
              slug: 'test',
              roles: [
                {
                  slug: 'mechanic',
                  hooks: {
                    onBrain: {
                      onBoot: [
                        {
                          command: 'npx rhachet roles boot --role mechanic',
                          timeout: 'PT120S',
                        },
                      ],
                    },
                  },
                },
              ] as unknown as Role[],
            } as RoleRegistry,
          }),
        );
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
