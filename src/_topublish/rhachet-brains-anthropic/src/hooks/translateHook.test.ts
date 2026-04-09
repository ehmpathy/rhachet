import { given, then, when } from 'test-fns';

import type { BrainHook } from '@src/domain.objects/BrainHook';

import {
  translateHookFromClaudeCode,
  translateHookToClaudeCode,
} from './translateHook';

describe('translateHook', () => {
  describe('translateHookToClaudeCode', () => {
    given('[case1] onBoot hook without filter', () => {
      const hook: BrainHook = {
        author: 'repo=test/role=tester',
        event: 'onBoot',
        command: 'echo "hello"',
        timeout: 'PT30S',
      };

      when('[t0] translated', () => {
        const result = translateHookToClaudeCode({ hook });

        then('event is SessionStart', () => {
          expect(result.event).toEqual('SessionStart');
        });

        then('entry has command', () => {
          expect(result.entry.hooks[0]?.command).toEqual('echo "hello"');
        });

        then('entry matcher is wildcard', () => {
          expect(result.entry.matcher).toEqual('*');
        });

        then('entry has timeout in milliseconds', () => {
          expect(result.entry.hooks[0]?.timeout).toEqual(30000);
        });
      });
    });

    given('[case2] onTool hook with filter', () => {
      const hook: BrainHook = {
        author: 'repo=test/role=tester',
        event: 'onTool',
        command: 'npx rhachet run --init check',
        timeout: 'PT60S',
        filter: { what: 'Write' },
      };

      when('[t0] translated', () => {
        const result = translateHookToClaudeCode({ hook });

        then('event is PreToolUse', () => {
          expect(result.event).toEqual('PreToolUse');
        });

        then('entry matcher matches filter', () => {
          expect(result.entry.matcher).toEqual('Write');
        });

        then('timeout is 60 seconds', () => {
          expect(result.entry.hooks[0]?.timeout).toEqual(60000);
        });
      });
    });

    given('[case3] onStop hook', () => {
      const hook: BrainHook = {
        author: 'repo=test/role=tester',
        event: 'onStop',
        command: 'echo "bye"',
        timeout: 'PT10S',
      };

      when('[t0] translated', () => {
        const result = translateHookToClaudeCode({ hook });

        then('event is Stop', () => {
          expect(result.event).toEqual('Stop');
        });
      });
    });

    given('[case4] timeout in milliseconds', () => {
      const hook: BrainHook = {
        author: 'repo=test/role=tester',
        event: 'onBoot',
        command: 'echo "fast"',
        timeout: { milliseconds: 500 },
      };

      when('[t0] translated', () => {
        const result = translateHookToClaudeCode({ hook });

        then('timeout is 500 milliseconds', () => {
          expect(result.entry.hooks[0]?.timeout).toEqual(500);
        });
      });
    });

    given('[case5] onBoot hook with filter.what=PostCompact', () => {
      const hook: BrainHook = {
        author: 'repo=test/role=tester',
        event: 'onBoot',
        command: 'echo "post"',
        timeout: 'PT30S',
        filter: { what: 'PostCompact' },
      };

      when('[t0] translated', () => {
        const result = translateHookToClaudeCode({ hook });

        then('event is PostCompact', () => {
          expect(result.event).toEqual('PostCompact');
        });

        then('entry matcher is wildcard', () => {
          expect(result.entry.matcher).toEqual('*');
        });
      });
    });

    given('[case6] onBoot hook with filter.what=PreCompact', () => {
      const hook: BrainHook = {
        author: 'repo=test/role=tester',
        event: 'onBoot',
        command: 'echo "pre"',
        timeout: 'PT30S',
        filter: { what: 'PreCompact' },
      };

      when('[t0] translated', () => {
        const result = translateHookToClaudeCode({ hook });

        then('event is PreCompact', () => {
          expect(result.event).toEqual('PreCompact');
        });
      });
    });

    given('[case7] onBoot hook with filter.what=SessionStart', () => {
      const hook: BrainHook = {
        author: 'repo=test/role=tester',
        event: 'onBoot',
        command: 'echo "session"',
        timeout: 'PT30S',
        filter: { what: 'SessionStart' },
      };

      when('[t0] translated', () => {
        const result = translateHookToClaudeCode({ hook });

        then('event is SessionStart', () => {
          expect(result.event).toEqual('SessionStart');
        });
      });
    });

    given('[case8] onBoot hook with invalid filter.what', () => {
      const hook: BrainHook = {
        author: 'repo=test/role=tester',
        event: 'onBoot',
        command: 'echo "invalid"',
        timeout: 'PT30S',
        filter: { what: 'InvalidEvent' },
      };

      when('[t0] translated', () => {
        then('throws UnexpectedCodePathError', () => {
          expect(() => translateHookToClaudeCode({ hook })).toThrow(
            'invalid filter.what value for onBoot: InvalidEvent',
          );
        });
      });
    });

    given('[case9] onTalk hook', () => {
      const hook: BrainHook = {
        author: 'repo=test/role=tester',
        event: 'onTalk',
        command: 'echo "talk"',
        timeout: 'PT5S',
      };

      when('[t0] translated', () => {
        const { event, entry } = translateHookToClaudeCode({ hook });

        then('event is UserPromptSubmit', () => {
          expect(event).toEqual('UserPromptSubmit');
        });

        then('matcher is wildcard', () => {
          expect(entry.matcher).toEqual('*');
        });

        then('command is preserved', () => {
          expect(entry.hooks[0]?.command).toEqual('echo "talk"');
        });

        then('timeout is converted to milliseconds', () => {
          expect(entry.hooks[0]?.timeout).toEqual(5000);
        });
      });
    });
  });

  describe('translateHookFromClaudeCode', () => {
    given('[case1] SessionStart entry', () => {
      const entry = {
        matcher: '*',
        hooks: [{ type: 'command', command: 'echo "boot"', timeout: 30000 }],
      };

      when('[t0] translated', () => {
        const result = translateHookFromClaudeCode({
          event: 'SessionStart',
          entry,
          author: 'repo=test/role=tester',
        });

        then('returns one hook', () => {
          expect(result).toHaveLength(1);
        });

        then('event is onBoot', () => {
          expect(result[0]?.event).toEqual('onBoot');
        });

        then('author is set', () => {
          expect(result[0]?.author).toEqual('repo=test/role=tester');
        });

        then('command is preserved', () => {
          expect(result[0]?.command).toEqual('echo "boot"');
        });

        then('timeout is IsoDuration object', () => {
          expect(result[0]?.timeout).toEqual({ milliseconds: 30000 });
        });
      });
    });

    given('[case2] PreToolUse entry with matcher', () => {
      const entry = {
        matcher: 'Bash',
        hooks: [{ type: 'command', command: 'npx rhachet run --init check' }],
      };

      when('[t0] translated', () => {
        const result = translateHookFromClaudeCode({
          event: 'PreToolUse',
          entry,
          author: 'repo=test/role=tester',
        });

        then('event is onTool', () => {
          expect(result[0]?.event).toEqual('onTool');
        });

        then('filter.what is set from matcher', () => {
          expect(result[0]?.filter?.what).toEqual('Bash');
        });
      });
    });

    given('[case3] entry with multiple hooks', () => {
      const entry = {
        matcher: '*',
        hooks: [
          { type: 'command', command: 'echo "one"' },
          { type: 'command', command: 'echo "two"' },
        ],
      };

      when('[t0] translated', () => {
        const result = translateHookFromClaudeCode({
          event: 'SessionStart',
          entry,
          author: 'repo=test/role=tester',
        });

        then('returns two hooks', () => {
          expect(result).toHaveLength(2);
        });

        then('first hook has first command', () => {
          expect(result[0]?.command).toEqual('echo "one"');
        });

        then('second hook has second command', () => {
          expect(result[1]?.command).toEqual('echo "two"');
        });
      });
    });

    given('[case4] unknown event', () => {
      const entry = {
        matcher: '*',
        hooks: [{ type: 'command', command: 'echo "unknown"' }],
      };

      when('[t0] translated', () => {
        const result = translateHookFromClaudeCode({
          event: 'UnknownEvent',
          entry,
          author: 'repo=test/role=tester',
        });

        then('returns empty array', () => {
          expect(result).toHaveLength(0);
        });
      });
    });

    given('[case5] PostCompact entry', () => {
      const entry = {
        matcher: '*',
        hooks: [{ type: 'command', command: 'echo "compact"', timeout: 30000 }],
      };

      when('[t0] translated', () => {
        const result = translateHookFromClaudeCode({
          event: 'PostCompact',
          entry,
          author: 'repo=test/role=tester',
        });

        then('returns one hook', () => {
          expect(result).toHaveLength(1);
        });

        then('event is onBoot', () => {
          expect(result[0]?.event).toEqual('onBoot');
        });

        then('filter.what is PostCompact', () => {
          expect(result[0]?.filter?.what).toEqual('PostCompact');
        });
      });
    });

    given('[case6] PreCompact entry', () => {
      const entry = {
        matcher: '*',
        hooks: [
          { type: 'command', command: 'echo "precompact"', timeout: 30000 },
        ],
      };

      when('[t0] translated', () => {
        const result = translateHookFromClaudeCode({
          event: 'PreCompact',
          entry,
          author: 'repo=test/role=tester',
        });

        then('returns one hook', () => {
          expect(result).toHaveLength(1);
        });

        then('event is onBoot', () => {
          expect(result[0]?.event).toEqual('onBoot');
        });

        then('filter.what is PreCompact', () => {
          expect(result[0]?.filter?.what).toEqual('PreCompact');
        });
      });
    });

    given('[case7] timeout formats', () => {
      when('[t0] timeout divisible by 1000', () => {
        const result = translateHookFromClaudeCode({
          event: 'SessionStart',
          entry: {
            matcher: '*',
            hooks: [{ type: 'command', command: 'echo', timeout: 60000 }],
          },
          author: 'test',
        });

        then('returns IsoDuration object with milliseconds', () => {
          expect(result[0]?.timeout).toEqual({ milliseconds: 60000 });
        });
      });

      when('[t1] timeout not divisible by 1000', () => {
        const result = translateHookFromClaudeCode({
          event: 'SessionStart',
          entry: {
            matcher: '*',
            hooks: [{ type: 'command', command: 'echo', timeout: 1500 }],
          },
          author: 'test',
        });

        then('returns IsoDuration object with milliseconds', () => {
          expect(result[0]?.timeout).toEqual({ milliseconds: 1500 });
        });
      });

      when('[t2] no timeout', () => {
        const result = translateHookFromClaudeCode({
          event: 'SessionStart',
          entry: {
            matcher: '*',
            hooks: [{ type: 'command', command: 'echo' }],
          },
          author: 'test',
        });

        then('defaults to 30 seconds IsoDuration', () => {
          expect(result[0]?.timeout).toEqual({ seconds: 30 });
        });
      });
    });

    given('[case8] UserPromptSubmit entry', () => {
      const entry = {
        matcher: '*',
        hooks: [{ type: 'command', command: 'echo "talk"', timeout: 5000 }],
      };

      when('[t0] translated', () => {
        const result = translateHookFromClaudeCode({
          event: 'UserPromptSubmit',
          entry,
          author: 'repo=test/role=tester',
        });

        then('returns one hook', () => {
          expect(result).toHaveLength(1);
        });

        then('event is onTalk', () => {
          expect(result[0]?.event).toEqual('onTalk');
        });

        then('author is set', () => {
          expect(result[0]?.author).toEqual('repo=test/role=tester');
        });

        then('command is preserved', () => {
          expect(result[0]?.command).toEqual('echo "talk"');
        });

        then('timeout is IsoDuration object', () => {
          expect(result[0]?.timeout).toEqual({ milliseconds: 5000 });
        });
      });
    });
  });
});
