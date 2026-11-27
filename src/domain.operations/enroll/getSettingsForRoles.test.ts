import { given, then, when } from 'test-fns';

import type { ClaudeCodeSettings } from '@src/domain.operations/brains/claudeCodeSettings';

import { getSettingsForRoles } from './getSettingsForRoles';

const genHook = (input: { author: string; command: string }) => ({
  type: 'command' as const,
  command: input.command,
  author: input.author,
});

describe('getSettingsForRoles', () => {
  given('[case1] hooks from two roles whose slugs share a prefix', () => {
    const settings: ClaudeCodeSettings = {
      permissions: { allow: ['Bash(ls)'] },
      hooks: {
        SessionStart: [
          {
            matcher: '*',
            hooks: [
              genHook({
                author: 'repo=ehmpathy/role=architect',
                command: 'boot-architect',
              }),
              genHook({
                author: 'repo=ehmpathy/role=architect-ops',
                command: 'boot-architect-ops',
              }),
            ],
          },
        ],
      },
    };

    when('[t0] the actor is enrolled in `architect` alone', () => {
      const narrowed = getSettingsForRoles({
        settings,
        roles: ['architect'],
        isArmedByMods: false,
      });

      then('it keeps the `architect` hook', () => {
        const commands = narrowed.hooks?.SessionStart?.[0]?.hooks.map(
          (hook) => hook.command,
        );
        expect(commands).toContain('boot-architect');
      });

      then(
        '🔴 it drops the `architect-ops` hook — a prefix is not the role',
        () => {
          const commands = narrowed.hooks?.SessionStart?.[0]?.hooks.map(
            (hook) => hook.command,
          );
          expect(commands).not.toContain('boot-architect-ops');
        },
      );

      then('every non-hook key is kept', () => {
        expect(narrowed.permissions).toEqual({ allow: ['Bash(ls)'] });
      });
    });

    when('[t1] the actor is enrolled in `architect-ops` alone', () => {
      const narrowed = getSettingsForRoles({
        settings,
        roles: ['architect-ops'],
        isArmedByMods: false,
      });

      then('it keeps only the `architect-ops` hook', () => {
        const commands = narrowed.hooks?.SessionStart?.[0]?.hooks.map(
          (hook) => hook.command,
        );
        expect(commands).toEqual(['boot-architect-ops']);
      });
    });
  });

  given('[case2] an entry whose hooks belong to no enrolled role', () => {
    const settings: ClaudeCodeSettings = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [
              genHook({ author: 'repo=bhrain/role=driver', command: 'guard' }),
            ],
          },
        ],
        Stop: [
          {
            matcher: '*',
            hooks: [genHook({ author: 'unauthored-shape', command: 'stop' })],
          },
        ],
      },
    };

    when('[t0] the actor is enrolled in `mechanic`', () => {
      const narrowed = getSettingsForRoles({
        settings,
        roles: ['mechanic'],
        isArmedByMods: false,
      });

      then('the event category with no surviving hook is dropped', () => {
        expect(narrowed.hooks).toEqual({});
      });
    });
  });

  given(
    '[case3] the actor is enrolled in a role at a subject focus (H1)',
    () => {
      const settings: ClaudeCodeSettings = {
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                genHook({
                  author: 'repo=ehmpathy/role=mechanic',
                  command: 'check-permissions',
                }),
                genHook({
                  author: 'repo=ehmpathy/role=mechanic',
                  command: 'forbid-gerunds',
                }),
              ],
            },
          ],
        },
      };

      when('[t0] enrolled as mechanic::flow', () => {
        const narrowed = getSettingsForRoles({
          settings,
          roles: ['any', 'mechanic::flow'],
          isArmedByMods: false,
        });

        then('🔴 every hook of the role lands — hooks follow the role', () => {
          expect(narrowed).toEqual(settings);
        });
      });
    },
  );

  given('[case4] two repos with one slug, and a pinned enroll', () => {
    const settings: ClaudeCodeSettings = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [
              genHook({
                author: 'repo=ehmpathy/role=mechanic',
                command: 'check-permissions',
              }),
              genHook({
                author: 'repo=acme/role=mechanic',
                command: 'acme-guard',
              }),
            ],
          },
        ],
      },
    };

    when('[t0] enrolled as ehmpathy/mechanic', () => {
      const narrowed = getSettingsForRoles({
        settings,
        roles: ['ehmpathy/mechanic'],
        isArmedByMods: false,
      });

      then('🔴 the pinned role keeps its own hooks', () => {
        const commands = narrowed.hooks?.PreToolUse?.[0]?.hooks.map(
          (hook) => hook.command,
        );
        expect(commands).toEqual(['check-permissions']);
      });
    });

    when('[t1] enrolled as the bare mechanic', () => {
      const narrowed = getSettingsForRoles({
        settings,
        roles: ['mechanic'],
        isArmedByMods: false,
      });

      then('the bare slug carries the hooks of every repo', () => {
        expect(narrowed).toEqual(settings);
      });
    });
  });

  given('[case5] the stop sweep, carried by the `.this` role `any`', () => {
    const settings: ClaudeCodeSettings = {
      hooks: {
        Stop: [
          {
            matcher: '*',
            hooks: [
              genHook({
                author: 'repo=.this/role=any',
                command:
                  './node_modules/.bin/rhachet roles cost --all --when hook.onStop',
              }),
            ],
          },
        ],
      },
    };

    when('[t0] a mod arms it, and the actor holds no `.this` role', () => {
      const narrowed = getSettingsForRoles({
        settings,
        roles: ['surfer'],
        isArmedByMods: true,
      });

      then('🔴 the sweep rides the actor, so its seat hears the fault', () => {
        expect(narrowed).toEqual(settings);
      });
    });

    when(
      '[t1] only a budget arms it, and the actor holds no `.this` role',
      () => {
        const narrowed = getSettingsForRoles({
          settings,
          roles: ['surfer'],
          isArmedByMods: false,
        });

        then('the sweep rides the holders of its carrier alone', () => {
          expect(narrowed.hooks).toEqual({});
        });
      },
    );
  });
});
