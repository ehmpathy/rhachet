import { ConstraintError } from 'helpful-errors';
import { getError } from 'test-fns';

import { genSampleHookDispatchRule } from '@src/.test/assets/genSampleHookDispatchRule';
import { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';

import {
  asHookDispatchManifestText,
  HOOK_DISPATCH_MANIFEST_HEAD,
  HOOK_DISPATCH_MANIFEST_SEP,
} from './asHookDispatchManifestText';
import { asHookDispatchRulesFromManifestText } from './asHookDispatchRulesFromManifestText';

const PATH = 'hooks.dispatch.manifest';

// a rule with sane defaults; each case overrides what it tests
const genRule = genSampleHookDispatchRule;

const ROUND_TRIP_CASES = [
  { description: 'no rules', rules: [] },
  { description: 'one foreign rule', rules: [genRule({})] },
  {
    description: 'a rule with args that hold spaces',
    rules: [
      genRule({
        kind: 'rhx-skill',
        path: '.agent/repo=demo/role=tester/skills/greet.sh',
        frame: '🪨 run solid skill repo=demo/role=tester/skill=greet',
        args: ['--skill', 'greet', '--name', 'Jamie Rivera', 'two  spaces'],
        command: 'rhx greet --name Jamie',
      }),
    ],
  },
  {
    description: 'a rule with no args',
    rules: [genRule({ kind: 'shell', path: 'x.sh', command: 'bash x.sh' })],
  },
  {
    description: 'a rule with an empty matcher',
    rules: [genRule({ matcher: '' })],
  },
  {
    description: 'a rule with a regex matcher',
    rules: [genRule({ matcher: 'Write|Edit|mcp__.*' })],
  },
  {
    description: 'a rule with when before',
    rules: [genRule({ when: 'before' })],
  },
  {
    description: 'a rule with when after',
    rules: [genRule({ when: 'after' })],
  },
  {
    description: 'a rule with the one-second timeout floor',
    rules: [genRule({ timeoutSeconds: 1 })],
  },
  {
    description: 'one rule of every kind, in order',
    rules: [
      genRule({ kind: 'rhx-skill', command: 'c1' }),
      genRule({ kind: 'rhx-init', command: 'c2' }),
      genRule({ kind: 'shell', command: 'c3' }),
      genRule({ kind: 'exec', command: 'c4' }),
      genRule({ kind: 'foreign', command: 'c5' }),
    ],
  },
  {
    description: 'a command with a quote, a pipe, and an accent',
    rules: [genRule({ command: `echo "a b" | cat > /tmp/x && echo 'é'` })],
  },
] as const;

describe('asHookDispatchManifestText', () => {
  describe('round trip: text → rules equals the input rules', () => {
    ROUND_TRIP_CASES.map((thisCase) =>
      test(thisCase.description, () => {
        const text = asHookDispatchManifestText({
          rules: [...thisCase.rules],
        });
        const rules = asHookDispatchRulesFromManifestText({ text, path: PATH });
        expect(rules).toEqual(thisCase.rules);
        expect(rules.every((rule) => rule instanceof HookDispatchRule)).toBe(
          true,
        );
      }),
    );
  });

  describe('text', () => {
    test('opens with the header line', () => {
      const text = asHookDispatchManifestText({ rules: [genRule({})] });
      expect(text.split('\n')[0]).toEqual(HOOK_DISPATCH_MANIFEST_HEAD);
      expect(HOOK_DISPATCH_MANIFEST_HEAD.startsWith('#')).toBe(true);
    });

    test('an empty list holds the header alone, ended by a newline', () => {
      expect(asHookDispatchManifestText({ rules: [] })).toEqual(
        `${HOOK_DISPATCH_MANIFEST_HEAD}\n`,
      );
    });

    test('holds one row per rule, each after a plain-text label line, in order, ended by a newline', () => {
      const text = asHookDispatchManifestText({
        rules: [genRule({ command: 'one' }), genRule({ command: 'two' })],
      });
      const lines = text.split('\n');
      expect(lines).toHaveLength(6);
      expect(lines[5]).toEqual('');
      expect(lines[1]).toEqual(
        '# PreToolUse · * · 30s · repo=demo/role=tester · one',
      );
      expect(lines[2]).toContain('one');
      expect(lines[3]).toEqual(
        '# PreToolUse · * · 30s · repo=demo/role=tester · two',
      );
      expect(lines[4]).toContain('two');
    });

    test('the manifest matches the snapshot, so a human can read it', () => {
      const text = asHookDispatchManifestText({
        rules: [
          genRule({ command: 'one' }),
          genRule({ event: 'Stop', matcher: '', command: 'two' }),
        ],
      });
      expect(
        text
          .split(HOOK_DISPATCH_MANIFEST_SEP.field)
          .join('␟')
          .split(HOOK_DISPATCH_MANIFEST_SEP.arg)
          .join('␞'),
      ).toMatchSnapshot();
    });

    test('a row holds ten fields, in the declared order', () => {
      const text = asHookDispatchManifestText({
        rules: [
          genRule({
            event: 'Stop',
            matcher: 'Bash',
            timeoutSeconds: 12,
            author: 'repo=demo/role=tester',
            kind: 'shell',
            path: 'x.sh',
            frame: 'frame',
            args: ['a', 'b'],
            command: 'bash x.sh a b',
            when: 'after',
          }),
        ],
      });
      const fields = text
        .split('\n')[2]!
        .split(HOOK_DISPATCH_MANIFEST_SEP.field);
      expect(fields).toEqual([
        'Stop',
        'Bash',
        '12',
        'repo=demo/role=tester',
        'shell',
        'x.sh',
        'frame',
        `a${HOOK_DISPATCH_MANIFEST_SEP.arg}b`,
        'bash x.sh a b',
        'after',
      ]);
    });

    test('an absent when leaves an empty last field, so the row keeps ten fields', () => {
      const text = asHookDispatchManifestText({
        rules: [genRule({ when: null })],
      });
      const fields = text
        .split('\n')[2]!
        .split(HOOK_DISPATCH_MANIFEST_SEP.field);
      expect(fields).toHaveLength(10);
      expect(fields[9]).toEqual('');
    });
  });
});

describe('asHookDispatchRulesFromManifestText', () => {
  test('skips the header, comment lines, and empty lines', () => {
    const row = asHookDispatchManifestText({ rules: [genRule({})] }).split(
      '\n',
    )[2]!;
    const text = ['# header', '', '# note', row, '', ''].join('\n');
    expect(asHookDispatchRulesFromManifestText({ text, path: PATH })).toEqual([
      genRule({}),
    ]);
  });

  test('empty text holds no rules', () => {
    expect(
      asHookDispatchRulesFromManifestText({ text: '', path: PATH }),
    ).toEqual([]);
  });

  const row = (fields: string[]) =>
    fields.join(HOOK_DISPATCH_MANIFEST_SEP.field);
  const fieldsGood = [
    'Stop',
    '*',
    '30',
    'repo=demo/role=tester',
    'foreign',
    '',
    '',
    '',
    'echo hi',
    '',
  ];
  const MALFORMED_CASES = [
    {
      description: 'a row with too few fields',
      fields: fieldsGood.slice(0, 9),
    },
    { description: 'a row with too many fields', fields: [...fieldsGood, 'x'] },
    {
      description: 'a row with an unknown kind',
      fields: fieldsGood.map((f, i) => (i === 4 ? 'wizard' : f)),
    },
    {
      description: 'a row with a timeout that is no integer',
      fields: fieldsGood.map((f, i) => (i === 2 ? '3.5' : f)),
    },
    {
      description: 'a row with a negative timeout',
      fields: fieldsGood.map((f, i) => (i === 2 ? '-3' : f)),
    },
    {
      description: 'a row with an empty timeout',
      fields: fieldsGood.map((f, i) => (i === 2 ? '' : f)),
    },
    {
      description:
        'a row with a zero timeout, which the watchdog would read as none',
      fields: fieldsGood.map((f, i) => (i === 2 ? '0' : f)),
    },
    {
      description: 'a row with a zero-padded timeout',
      fields: fieldsGood.map((f, i) => (i === 2 ? '07' : f)),
    },
    {
      description: 'a row with an unknown when',
      fields: fieldsGood.map((f, i) => (i === 9 ? 'later' : f)),
    },
  ];
  MALFORMED_CASES.map((thisCase) =>
    test(`refuses ${thisCase.description}, with the path and a hint`, async () => {
      const error = await getError(async () =>
        asHookDispatchRulesFromManifestText({
          text: row(thisCase.fields),
          path: PATH,
        }),
      );
      expect(error).toBeInstanceOf(ConstraintError);
      expect(error.message).toContain('malformed');
      expect((error as ConstraintError).metadata).toMatchObject({ path: PATH });
      expect(JSON.stringify((error as ConstraintError).metadata)).toContain(
        'npx rhx init --hooks',
      );
    }),
  );
});
