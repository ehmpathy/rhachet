import { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';

/**
 * .what = a hook dispatch rule with sane defaults; each case overrides what it tests
 * .why = the dispatch transformers' tests all build rules of this one shape
 */
export const genSampleHookDispatchRule = (
  input: Partial<HookDispatchRule>,
): HookDispatchRule =>
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
