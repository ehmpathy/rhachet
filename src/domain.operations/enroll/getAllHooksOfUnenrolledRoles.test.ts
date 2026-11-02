import { given, then, when } from 'test-fns';

import type { ClaudeCodeSettings } from '@src/domain.operations/brains/claudeCodeSettings';

import { getAllHooksOfUnenrolledRoles } from './getAllHooksOfUnenrolledRoles';

const genHook = (input: { author?: string; command: string }) => ({
  type: 'command' as const,
  command: input.command,
  ...(input.author ? { author: input.author } : {}),
});

const settings: ClaudeCodeSettings = {
  hooks: {
    SessionStart: [
      {
        matcher: '*',
        hooks: [
          genHook({
            author: 'repo=bhrain/role=driver',
            command: 'boot-driver',
          }),
          genHook({
            author: 'repo=ehmpathy/role=mechanic',
            command: 'boot-mechanic',
          }),
          genHook({ command: 'the-humans-own' }),
        ],
      },
    ],
    Stop: [
      {
        matcher: '*',
        hooks: [
          genHook({
            author: 'repo=ehmpathy/role=architect-ops',
            command: 'stop',
          }),
        ],
      },
    ],
  },
};

describe('getAllHooksOfUnenrolledRoles', () => {
  given('[case1] a clone enrolled without driver', () => {
    when('[t0] the settings carry a driver hook', () => {
      then(
        'the driver hook is reported, the enrolled and authorless hooks are not',
        () => {
          expect(
            getAllHooksOfUnenrolledRoles({
              settings,
              roles: ['mechanic', 'architect-ops'],
            }),
          ).toEqual([
            { event: 'SessionStart', author: 'repo=bhrain/role=driver' },
          ]);
        },
      );
    });
  });

  given('[case2] a role slug that prefixes another', () => {
    when('[t0] only the shorter slug is enrolled', () => {
      then(
        'the longer slug is still reported, matched by whole segment',
        () => {
          expect(
            getAllHooksOfUnenrolledRoles({
              settings,
              roles: ['driver', 'mechanic', 'architect'],
            }),
          ).toEqual([
            { event: 'Stop', author: 'repo=ehmpathy/role=architect-ops' },
          ]);
        },
      );
    });
  });

  given('[case3] settings with no hooks', () => {
    when('[t0] they are scanned', () => {
      then('naught is reported', () => {
        expect(
          getAllHooksOfUnenrolledRoles({ settings: {}, roles: [] }),
        ).toEqual([]);
      });
    });
  });

  given('[case4] a role enrolled at a subject focus (wish 2)', () => {
    when('[t0] mechanic is enrolled as mechanic::flow', () => {
      then('its hooks count as enrolled — hooks follow the role', () => {
        expect(
          getAllHooksOfUnenrolledRoles({
            settings,
            roles: ['mechanic::flow', 'driver', 'architect-ops'],
          }),
        ).toEqual([]);
      });
    });
  });
});
