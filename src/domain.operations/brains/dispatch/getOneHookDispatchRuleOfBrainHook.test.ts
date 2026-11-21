import { ConstraintError } from 'helpful-errors';
import { getError } from 'test-fns';

import { BrainHook } from '@src/domain.objects/BrainHook';
import { BrainHookFilter } from '@src/domain.objects/BrainHookFilter';
import { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';

import { asBrainHookOfHookDispatchRule } from './asBrainHookOfHookDispatchRule';
import { getOneHookDispatchRuleOfBrainHook } from './getOneHookDispatchRuleOfBrainHook';

// .note = only the branches that read no file: the repo path below is empty, so a command
//   that would look for a role file (`rhx <skill>`, `rhachet run --skill X`) is not run here
const REPO_PATH = '/absent/repo';

const genHook = (input: Partial<BrainHook>): BrainHook =>
  new BrainHook({
    author: 'repo=demo/role=tester',
    event: 'onTool',
    command: 'echo hi',
    timeout: { seconds: 30 },
    ...input,
  });

describe('getOneHookDispatchRuleOfBrainHook', () => {
  describe('shared fields', () => {
    test('reads event, author, command, and timeout from the hook', () => {
      const rule = getOneHookDispatchRuleOfBrainHook({
        hook: genHook({
          author: 'repo=demo/role=builder',
          event: 'onStop',
          command: 'echo go',
          timeout: 'PT2M' as never,
        }),
        repoPath: REPO_PATH,
      });
      expect(rule).toBeInstanceOf(HookDispatchRule);
      expect(rule.event).toEqual('Stop');
      expect(rule.author).toEqual('repo=demo/role=builder');
      expect(rule.command).toEqual('echo go');
      expect(rule.timeoutSeconds).toEqual(120);
    });

    test('a hook with no filter reads as a star matcher and no when', () => {
      const rule = getOneHookDispatchRuleOfBrainHook({
        hook: genHook({}),
        repoPath: REPO_PATH,
      });
      expect(rule.matcher).toEqual('*');
      expect(rule.when).toBeNull();
    });

    test('a hook filter reads as its matcher and when', () => {
      const rule = getOneHookDispatchRuleOfBrainHook({
        hook: genHook({
          filter: new BrainHookFilter({ what: 'Write|Edit', when: 'after' }),
        }),
        repoPath: REPO_PATH,
      });
      expect(rule.matcher).toEqual('Write|Edit');
      expect(rule.when).toEqual('after');
    });
  });

  describe('kind', () => {
    const CASES = [
      {
        description:
          'a bash file command is a shell rule, with the file and args',
        command: 'bash .agent/x/hook.sh --flag value',
        expected: {
          kind: 'shell',
          path: '.agent/x/hook.sh',
          args: ['--flag', 'value'],
        },
      },
      {
        description: 'a bash file command with no args holds no args',
        command: 'bash hook.sh',
        expected: { kind: 'shell', path: 'hook.sh', args: [] },
      },
      {
        description: 'a bash command with a flag first runs as declared',
        command: 'bash -x hook.sh',
        expected: { kind: 'foreign', path: '', args: [] },
      },
      {
        description: 'a command with a quote runs as declared',
        command: `echo 'a b'`,
        expected: { kind: 'foreign', path: '', args: [] },
      },
      {
        description: 'a command with a pipe runs as declared',
        command: 'cat x | wc',
        expected: { kind: 'foreign', path: '', args: [] },
      },
      {
        description: 'a command with an expansion runs as declared',
        command: 'echo $HOME',
        expected: { kind: 'foreign', path: '', args: [] },
      },
      {
        description: 'a plain command of no known bin runs as declared',
        command: 'node ./tool.js',
        expected: { kind: 'foreign', path: '', args: [] },
      },
      {
        description: 'an rhx short circuit runs as declared',
        command: 'rhx keyrack status',
        expected: { kind: 'foreign', path: '', args: [] },
      },
      {
        description: 'an rhx call with a flag first runs as declared',
        command: 'rhx --help',
        expected: { kind: 'foreign', path: '', args: [] },
      },
      {
        description: 'an rhx call that passes a run flag runs as declared',
        command: 'rhx greet --repo demo',
        expected: { kind: 'foreign', path: '', args: [] },
      },
      {
        description: 'an npx rhx short circuit runs as declared',
        command: 'npx rhx init --hooks',
        expected: { kind: 'foreign', path: '', args: [] },
      },
      {
        description:
          'a bare rhachet run with no skill or init runs as declared',
        command: 'npx rhachet run',
        expected: { kind: 'foreign', path: '', args: [] },
      },
      {
        description: 'a rhachet run with both skill and init runs as declared',
        command: 'rhachet run --skill a --init b',
        expected: { kind: 'foreign', path: '', args: [] },
      },
      {
        description: 'a rhachet run that repeats a run flag runs as declared',
        command: 'rhachet run --skill a --skill b',
        expected: { kind: 'foreign', path: '', args: [] },
      },
      {
        description: 'an empty command runs as declared',
        command: '',
        expected: { kind: 'foreign', path: '', args: [] },
      },
    ] as const;
    CASES.map((thisCase) =>
      test(thisCase.description, () => {
        const rule = getOneHookDispatchRuleOfBrainHook({
          hook: genHook({ command: thisCase.command }),
          repoPath: REPO_PATH,
        });
        expect({
          kind: rule.kind,
          path: rule.path,
          args: rule.args,
        }).toEqual(thisCase.expected);
        expect(rule.frame).toEqual('');
      }),
    );
  });

  describe('read back', () => {
    test('a rule reads back as a hook that diffs equal to the declared one', () => {
      const hook = genHook({
        command: 'bash hook.sh a b',
        filter: new BrainHookFilter({ what: 'Bash', when: 'after' }),
      });
      const rule = getOneHookDispatchRuleOfBrainHook({
        hook,
        repoPath: REPO_PATH,
      });
      const back = asBrainHookOfHookDispatchRule({ rule });
      expect(back.author).toEqual(hook.author);
      expect(back.event).toEqual(hook.event);
      expect(back.command).toEqual(hook.command);
      expect(back.timeout).toEqual({ seconds: 30 });
      expect({ ...back.filter }).toEqual({ what: 'Bash', when: 'after' });
    });
  });

  describe('a command that cannot sit in one manifest row', () => {
    const BREAKERS = [
      { description: 'a newline', char: '\n' },
      { description: 'a carriage return', char: '\r' },
      { description: 'an arg separator', char: '\x1e' },
      { description: 'a field separator', char: '\x1f' },
    ] as const;
    BREAKERS.map((thisCase) =>
      test(`refuses ${thisCase.description}, with a hint`, async () => {
        const error = await getError(async () =>
          getOneHookDispatchRuleOfBrainHook({
            hook: genHook({ command: `echo a${thisCase.char}echo b` }),
            repoPath: REPO_PATH,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('line break');
        expect(JSON.stringify((error as ConstraintError).metadata)).toContain(
          'one line',
        );
      }),
    );
  });

  describe('the refusals a role author meets at sync, as a human reads them', () => {
    const REFUSALS = [
      {
        description: 'a matcher in a regex syntax only js reads',
        hook: genHook({ filter: new BrainHookFilter({ what: 'Bash\\d' }) }),
      },
      {
        description: 'a command with a line break',
        hook: genHook({ command: 'echo a\necho b' }),
      },
    ];
    REFUSALS.map((thisCase) =>
      test(`refuses ${thisCase.description}, with the fix named`, async () => {
        const error = await getError(async () =>
          getOneHookDispatchRuleOfBrainHook({
            hook: thisCase.hook,
            repoPath: REPO_PATH,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        // pretty json text, so a line break inside a value reads as `\n`, never as a broken line
        expect(
          JSON.stringify(
            {
              message: error.message,
              metadata: (error as ConstraintError).metadata,
            },
            null,
            2,
          ),
        ).toMatchSnapshot();
      }),
    );
  });

  describe('a field other than the command that cannot sit in one manifest row', () => {
    const FIELDS = [
      {
        description: 'an author',
        hook: genHook({ author: 'repo=test/role=a\nb' }),
        field: 'author',
      },
      {
        description: 'a when',
        hook: genHook({
          filter: { what: 'Bash', when: 'after\x1f' as 'after' },
        }),
        field: 'when',
      },
    ];
    FIELDS.map((thisCase) =>
      test(`refuses ${thisCase.description} with a line break, and names the field`, async () => {
        const error = await getError(async () =>
          getOneHookDispatchRuleOfBrainHook({
            hook: thisCase.hook,
            repoPath: REPO_PATH,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(
          (error as ConstraintError).metadata?.fieldsBroken as string[],
        ).toEqual([thisCase.field]);
      }),
    );
  });
});
