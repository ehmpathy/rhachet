import { genSampleHookDispatchRule } from '@src/.test/assets/genSampleHookDispatchRule';

import { asHookDispatchersOfRules } from './asHookDispatchersOfRules';
import { HOOK_DISPATCH } from './constants';

const MANIFEST_PATH =
  '.agent/.actors/actor.via.slug=demo/brain/.claude/hooks.dispatch.manifest';

// a rule with sane defaults; each case overrides what it tests
const genRule = genSampleHookDispatchRule;

// every mapped event, wired whole
const WHOLE = [
  { event: 'SessionStart', matcher: '*' },
  { event: 'PreToolUse', matcher: '*' },
  { event: 'UserPromptSubmit', matcher: '*' },
  { event: 'Stop', matcher: '*' },
];

const TEST_CASES = [
  {
    description: 'one Bash rule still yields a `*` wire on every mapped event',
    rules: [genRule({ event: 'PreToolUse', matcher: 'Bash' })],
    expected: WHOLE,
  },
  {
    description: 'many rules of one event yield one dispatcher for it',
    rules: [
      genRule({ event: 'Stop', matcher: '*' }),
      genRule({ event: 'Stop', matcher: '*', command: 'echo two' }),
      genRule({ event: 'Stop', matcher: '*', command: 'echo three' }),
    ],
    expected: WHOLE,
  },
  {
    description:
      'events come back in one fixed order, whatever order the rows hold',
    rules: [
      genRule({ event: 'Stop' }),
      genRule({ event: 'SessionStart' }),
      genRule({ event: 'PreToolUse' }),
    ],
    expected: WHOLE,
  },
  {
    description:
      'matchers of rows never narrow the wire: a list, a comma list, a regex',
    rules: [
      genRule({ matcher: 'Bash' }),
      genRule({ matcher: 'Write,Edit' }),
      genRule({ matcher: 'mcp__.*' }),
    ],
    expected: WHOLE,
  },
  {
    description: 'an empty manifest still wires every mapped event',
    rules: [],
    expected: WHOLE,
  },
  {
    description: 'no manifest yields no dispatchers',
    rules: null,
    expected: [],
  },
  {
    description:
      'only the four mapped events are wired, whatever event a row names',
    rules: [genRule({ event: 'PermissionRequest' })],
    expected: WHOLE,
  },
] as const;

describe('asHookDispatchersOfRules', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const dispatchers = asHookDispatchersOfRules({
        rules: thisCase.rules === null ? null : [...thisCase.rules],
        manifestPathRel: MANIFEST_PATH,
      });
      expect(
        dispatchers.map(({ event, matcher }) => ({ event, matcher })),
      ).toEqual(thisCase.expected);
    }),
  );

  describe('the wire holds naught a later row could move', () => {
    test('a row added for a tool no row named before leaves every dispatcher as it was', () => {
      const before = asHookDispatchersOfRules({
        rules: [genRule({ matcher: 'Bash', timeoutSeconds: 15 })],
        manifestPathRel: MANIFEST_PATH,
      });
      const after = asHookDispatchersOfRules({
        rules: [
          genRule({ matcher: 'Bash', timeoutSeconds: 15 }),
          genRule({
            matcher: 'Agent',
            timeoutSeconds: 30,
            command: 'echo agent',
          }),
        ],
        manifestPathRel: MANIFEST_PATH,
      });
      expect(after).toEqual(before);
    });

    test('a row added on an event no row held before leaves every dispatcher as it was', () => {
      const before = asHookDispatchersOfRules({
        rules: [genRule({ event: 'PreToolUse' })],
        manifestPathRel: MANIFEST_PATH,
      });
      const after = asHookDispatchersOfRules({
        rules: [
          genRule({ event: 'PreToolUse' }),
          genRule({ event: 'UserPromptSubmit', command: 'echo remind' }),
        ],
        manifestPathRel: MANIFEST_PATH,
      });
      expect(after).toEqual(before);
    });
  });

  describe('timeout', () => {
    test('sits at the floor by the margin, when every rule is faster', () => {
      const [dispatcher] = asHookDispatchersOfRules({
        rules: [genRule({ event: 'SessionStart', timeoutSeconds: 10 })],
        manifestPathRel: MANIFEST_PATH,
      });
      expect(dispatcher!.timeoutSeconds).toEqual(
        HOOK_DISPATCH.timeoutFloorSeconds + HOOK_DISPATCH.timeoutMarginSeconds,
      );
    });

    test('sits at the floor by the margin, on an event with no rows', () => {
      const dispatchers = asHookDispatchersOfRules({
        rules: [],
        manifestPathRel: MANIFEST_PATH,
      });
      expect(dispatchers.map((d) => d.timeoutSeconds)).toEqual(
        dispatchers.map(
          () =>
            HOOK_DISPATCH.timeoutFloorSeconds +
            HOOK_DISPATCH.timeoutMarginSeconds,
        ),
      );
    });

    test('sits above the slowest rule by the margin, when one is slower than the floor', () => {
      const [dispatcher] = asHookDispatchersOfRules({
        rules: [
          genRule({ event: 'SessionStart', timeoutSeconds: 10 }),
          genRule({ event: 'SessionStart', timeoutSeconds: 90 }),
          genRule({ event: 'SessionStart', timeoutSeconds: 30 }),
        ],
        manifestPathRel: MANIFEST_PATH,
      });
      expect(dispatcher!.timeoutSeconds).toEqual(
        90 + HOOK_DISPATCH.timeoutMarginSeconds,
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
      expect(
        dispatchers.map(({ event, timeoutSeconds }) => ({
          event,
          timeoutSeconds,
        })),
      ).toEqual([
        {
          event: 'SessionStart',
          timeoutSeconds: 120 + HOOK_DISPATCH.timeoutMarginSeconds,
        },
        {
          event: 'PreToolUse',
          timeoutSeconds:
            HOOK_DISPATCH.timeoutFloorSeconds +
            HOOK_DISPATCH.timeoutMarginSeconds,
        },
        {
          event: 'UserPromptSubmit',
          timeoutSeconds:
            HOOK_DISPATCH.timeoutFloorSeconds +
            HOOK_DISPATCH.timeoutMarginSeconds,
        },
        {
          event: 'Stop',
          timeoutSeconds:
            HOOK_DISPATCH.timeoutFloorSeconds +
            HOOK_DISPATCH.timeoutMarginSeconds,
        },
      ]);
    });
  });

  describe('command', () => {
    test('runs the dispatcher bin on the manifest and the event', () => {
      const dispatchers = asHookDispatchersOfRules({
        rules: [],
        manifestPathRel: MANIFEST_PATH,
      });
      expect(dispatchers.map((d) => d.command)).toEqual([
        `bash ${HOOK_DISPATCH.bin} ${MANIFEST_PATH} SessionStart`,
        `bash ${HOOK_DISPATCH.bin} ${MANIFEST_PATH} PreToolUse`,
        `bash ${HOOK_DISPATCH.bin} ${MANIFEST_PATH} UserPromptSubmit`,
        `bash ${HOOK_DISPATCH.bin} ${MANIFEST_PATH} Stop`,
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
