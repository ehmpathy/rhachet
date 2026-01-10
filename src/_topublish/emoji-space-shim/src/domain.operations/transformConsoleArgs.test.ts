import { given, then, when } from 'test-fns';

import { transformConsoleArgs } from './transformConsoleArgs';

describe('transformConsoleArgs', () => {
  given('args with only string', () => {
    when('terminal is vscode', () => {
      then('transforms the string', () => {
        const result = transformConsoleArgs({
          args: ['🦫 hi'],
          terminal: 'vscode',
        });
        expect(result).toEqual(['🦫  hi']);
      });
    });
  });

  given('args with string and object', () => {
    when('terminal is vscode', () => {
      then('transforms string, passes object through', () => {
        const result = transformConsoleArgs({
          args: ['🦫 hi', { data: 1 }],
          terminal: 'vscode',
        });
        expect(result).toEqual(['🦫  hi', { data: 1 }]);
      });
    });
  });

  given('args with mixed types', () => {
    when('terminal is vscode', () => {
      then('transforms only strings', () => {
        const result = transformConsoleArgs({
          args: [42, '🦫 hi', null],
          terminal: 'vscode',
        });
        expect(result).toEqual([42, '🦫  hi', null]);
      });
    });
  });

  given('args with object that contains emoji', () => {
    when('terminal is vscode', () => {
      then('object is passed through unchanged', () => {
        const result = transformConsoleArgs({
          args: [{ emoji: '🦫' }],
          terminal: 'vscode',
        });
        expect(result).toEqual([{ emoji: '🦫' }]);
      });
    });
  });

  given('args with undefined and boolean', () => {
    when('terminal is vscode', () => {
      then('non-strings are passed through unchanged', () => {
        const result = transformConsoleArgs({
          args: [undefined, true, '🦫 test', false],
          terminal: 'vscode',
        });
        expect(result).toEqual([undefined, true, '🦫  test', false]);
      });
    });
  });

  given('empty args array', () => {
    when('terminal is vscode', () => {
      then('returns empty array', () => {
        const result = transformConsoleArgs({
          args: [],
          terminal: 'vscode',
        });
        expect(result).toEqual([]);
      });
    });
  });
});
