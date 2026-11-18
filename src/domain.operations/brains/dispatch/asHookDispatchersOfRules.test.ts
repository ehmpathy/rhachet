import { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';

import { asHookDispatchersOfRules } from './asHookDispatchersOfRules';
import { HOOK_DISPATCH } from './constants';

const MANIFEST_PATH =
  '.agent/.actors/actor.via.slug=demo/brain/.claude/hooks.dispatch.manifest';

// a rule with sane defaults; each case overrides what it tests
const genRule = (input: Partial<HookDispatchRule>): HookDispatchRule =>
  new HookDispatchRule({
    event: 'PreToolUse',
    matcher: '*',
    timeoutSeconds: 30,
    author: 'repo=demo/role=tester',
    kind: 'foreign',
    path: '',
    frame: '',
    args: [],
    command: 'echo hi',
    when: null,
    ...input,
  });

const TEST_CASES = [
  {
    description: 'one rule yields one dispatcher with its matcher',
    rules: [genRule({ event: 'PreToolUse', matcher: 'Bash' })],
    expected: [{ event: 'PreToolUse', matcher: 'Bash' }],
  },
  {
    description: 'many rules of one event yield one dispatcher',
    rules: [
      genRule({ event: 'Stop', matcher: '*' }),
      genRule({ event: 'Stop', matcher: '*', command: 'echo two' }),
      genRule({ event: 'Stop', matcher: '*', command: 'echo three' }),
    ],
    expected: [{ event: 'Stop', matcher: '*' }],
  },
  {
    description: 'events come back in the order their first rule holds',
    rules: [
      genRule({ event: 'Stop' }),
      genRule({ event: 'SessionStart' }),
      genRule({ event: 'Stop', command: 'echo two' }),
      genRule({ event: 'PreToolUse' }),
    ],
    expected: [
      { event: 'Stop', matcher: '*' },
      { event: 'SessionStart', matcher: '*' },
      { event: 'PreToolUse', matcher: '*' },
    ],
  },
  {
    description: 'matchers of one event join as a union, deduplicated',
    rules: [
      genRule({ matcher: 'Bash' }),
      genRule({ matcher: 'Write|Edit' }),
      genRule({ matcher: 'Bash' }),
    ],
    expected: [{ event: 'PreToolUse', matcher: 'Bash|Write|Edit' }],
  },
  {
    description: 'a comma list splits into names, joined by a bar',
    rules: [genRule({ matcher: 'Write,Edit' })],
    expected: [{ event: 'PreToolUse', matcher: 'Write|Edit' }],
  },
  {
    description: 'a star matcher widens the union to a star',
    rules: [genRule({ matcher: 'Bash' }), genRule({ matcher: '*' })],
    expected: [{ event: 'PreToolUse', matcher: '*' }],
  },
  {
    description: 'an empty matcher widens the union to a star',
    rules: [genRule({ matcher: 'Bash' }), genRule({ matcher: '' })],
    expected: [{ event: 'PreToolUse', matcher: '*' }],
  },
  {
    description: 'a regex matcher stays whole, as a group',
    rules: [genRule({ matcher: 'Bash' }), genRule({ matcher: 'mcp__.*' })],
    expected: [{ event: 'PreToolUse', matcher: 'Bash|(mcp__.*)' }],
  },
  {
    description: 'no rules yield no dispatchers',
    rules: [],
    expected: [],
  },
] as const;

describe('asHookDispatchersOfRules', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const dispatchers = asHookDispatchersOfRules({
        rules: [...thisCase.rules],
        manifestPathRel: MANIFEST_PATH,
      });
      expect(
        dispatchers.map(({ event, matcher }) => ({ event, matcher })),
      ).toEqual(thisCase.expected);
    }),
  );

  describe('timeout', () => {
    test('sits above the slowest rule by the margin', () => {
      const [dispatcher] = asHookDispatchersOfRules({
        rules: [
          genRule({ timeoutSeconds: 10 }),
          genRule({ timeoutSeconds: 90 }),
          genRule({ timeoutSeconds: 30 }),
        ],
        manifestPathRel: MANIFEST_PATH,
      });
      expect(dispatcher!.timeoutSeconds).toEqual(
        90 + HOOK_DISPATCH.timeoutMarginSeconds,
      );
    });

    test('a rule with no timeout takes the default', () => {
      const [dispatcher] = asHookDispatchersOfRules({
        rules: [
          genRule({ timeoutSeconds: 0 }),
          genRule({ timeoutSeconds: 10 }),
        ],
        manifestPathRel: MANIFEST_PATH,
      });
      expect(dispatcher!.timeoutSeconds).toEqual(
        HOOK_DISPATCH.timeoutDefaultSeconds +
          HOOK_DISPATCH.timeoutMarginSeconds,
      );
    });

    test('is per event, not shared across events', () => {
      const dispatchers = asHookDispatchersOfRules({
        rules: [
          genRule({ event: 'Stop', timeoutSeconds: 10 }),
          genRule({ event: 'SessionStart', timeoutSeconds: 120 }),
        ],
        manifestPathRel: MANIFEST_PATH,
      });
      expect(dispatchers.map((d) => d.timeoutSeconds)).toEqual([
        10 + HOOK_DISPATCH.timeoutMarginSeconds,
        120 + HOOK_DISPATCH.timeoutMarginSeconds,
      ]);
    });
  });

  describe('command', () => {
    test('runs the dispatcher bin on the manifest and the event', () => {
      const dispatchers = asHookDispatchersOfRules({
        rules: [genRule({ event: 'Stop' }), genRule({ event: 'SessionStart' })],
        manifestPathRel: MANIFEST_PATH,
      });
      expect(dispatchers.map((d) => d.command)).toEqual([
        `bash ${HOOK_DISPATCH.bin} ${MANIFEST_PATH} Stop`,
        `bash ${HOOK_DISPATCH.bin} ${MANIFEST_PATH} SessionStart`,
      ]);
    });
  });

  test('is deterministic: the same rules yield the same dispatchers', () => {
    const rules = [
      genRule({ matcher: 'Bash', timeoutSeconds: 15 }),
      genRule({ event: 'Stop' }),
    ];
    const once = asHookDispatchersOfRules({
      rules,
      manifestPathRel: MANIFEST_PATH,
    });
    const twice = asHookDispatchersOfRules({
      rules,
      manifestPathRel: MANIFEST_PATH,
    });
    expect(twice).toEqual(once);
  });
});
