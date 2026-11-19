import { genSampleHookDispatchRule } from '@src/.test/assets/genSampleHookDispatchRule';
import { BrainHookFilter } from '@src/domain.objects/BrainHookFilter';

import { asBrainHookOfHookDispatchRule } from './asBrainHookOfHookDispatchRule';

// a rule with sane defaults; each case overrides what it tests
const genRule = genSampleHookDispatchRule;

describe('asBrainHookOfHookDispatchRule', () => {
  test('reads author and command back as declared', () => {
    const hook = asBrainHookOfHookDispatchRule({
      rule: genRule({ author: 'repo=demo/role=builder', command: 'echo go' }),
    });
    expect(hook.author).toEqual('repo=demo/role=builder');
    expect(hook.command).toEqual('echo go');
  });

  const EVENT_CASES = [
    { claude: 'SessionStart', hook: 'onBoot' },
    { claude: 'PreToolUse', hook: 'onTool' },
    { claude: 'UserPromptSubmit', hook: 'onTalk' },
    { claude: 'Stop', hook: 'onStop' },
  ] as const;
  EVENT_CASES.map((thisCase) =>
    test(`reads claude event ${thisCase.claude} back as ${thisCase.hook}`, () => {
      const hook = asBrainHookOfHookDispatchRule({
        rule: genRule({ event: thisCase.claude }),
      });
      expect(hook.event).toEqual(thisCase.hook);
    }),
  );

  const TIMEOUT_CASES = [
    {
      description: 'reads a timeout in seconds',
      timeoutSeconds: 45,
      seconds: 45,
    },
    {
      description: 'reads a one-second timeout, the floor the writer emits',
      timeoutSeconds: 1,
      seconds: 1,
    },
  ] as const;
  TIMEOUT_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const hook = asBrainHookOfHookDispatchRule({
        rule: genRule({ timeoutSeconds: thisCase.timeoutSeconds }),
      });
      expect(hook.timeout).toEqual({ seconds: thisCase.seconds });
    }),
  );

  const FILTER_CASES = [
    {
      description: 'a star matcher with no when reads as no filter',
      matcher: '*',
      when: null,
      filter: undefined,
    },
    {
      description: 'a named matcher reads as a filter on that matcher',
      matcher: 'Bash',
      when: null,
      filter: { what: 'Bash' },
    },
    {
      description: 'a named matcher with when after keeps both',
      matcher: 'Write|Edit',
      when: 'after',
      filter: { what: 'Write|Edit', when: 'after' },
    },
    {
      description: 'a star matcher with when before keeps a filter',
      matcher: '*',
      when: 'before',
      filter: { what: '*', when: 'before' },
    },
  ] as const;
  FILTER_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const hook = asBrainHookOfHookDispatchRule({
        rule: genRule({ matcher: thisCase.matcher, when: thisCase.when }),
      });
      if (!thisCase.filter) {
        expect(hook.filter).toBeUndefined();
        return;
      }
      expect(hook.filter).toBeInstanceOf(BrainHookFilter);
      expect({ ...hook.filter }).toEqual(thisCase.filter);
    }),
  );
});
