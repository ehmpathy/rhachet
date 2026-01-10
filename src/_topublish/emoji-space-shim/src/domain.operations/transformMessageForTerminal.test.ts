import { given, then, when } from 'test-fns';

import { transformMessageForTerminal } from './transformMessageForTerminal';

describe('transformMessageForTerminal', () => {
  given('message with beaver emoji 🦫', () => {
    when('terminal is vscode', () => {
      then('adds 1 space after emoji', () => {
        const result = transformMessageForTerminal({
          message: '🦫 hello',
          terminal: 'vscode',
        });
        expect(result).toEqual('🦫  hello');
      });
    });

    when('terminal is vscode and message has 2 spaces', () => {
      then('preserves spaces and adds 1 more', () => {
        const result = transformMessageForTerminal({
          message: '🦫  hello',
          terminal: 'vscode',
        });
        expect(result).toEqual('🦫   hello');
      });
    });

    when('terminal is default', () => {
      then('no change', () => {
        const result = transformMessageForTerminal({
          message: '🦫 hello',
          terminal: 'default',
        });
        expect(result).toEqual('🦫 hello');
      });
    });
  });

  given('message with thunder cloud emoji ⛈️', () => {
    when('terminal is vscode', () => {
      then('adds 1 space after emoji', () => {
        const result = transformMessageForTerminal({
          message: '⛈️ woah!',
          terminal: 'vscode',
        });
        expect(result).toEqual('⛈️  woah!');
      });
    });

    when('terminal is default', () => {
      then('adds 1 space after emoji (both terminals need adjustment)', () => {
        const result = transformMessageForTerminal({
          message: '⛈️ woah!',
          terminal: 'default',
        });
        expect(result).toEqual('⛈️  woah!');
      });
    });
  });

  given('message with no emoji', () => {
    when('terminal is vscode', () => {
      then('no change', () => {
        const result = transformMessageForTerminal({
          message: 'hello world',
          terminal: 'vscode',
        });
        expect(result).toEqual('hello world');
      });
    });
  });

  given('message with multiple emojis', () => {
    when('terminal is vscode', () => {
      then('adjusts all emojis', () => {
        const result = transformMessageForTerminal({
          message: '🦫 review 🪨 done',
          terminal: 'vscode',
        });
        expect(result).toEqual('🦫  review 🪨  done');
      });
    });
  });

  given('message with emoji at end', () => {
    when('terminal is vscode', () => {
      then('adds space after emoji', () => {
        const result = transformMessageForTerminal({
          message: 'hello 🦫',
          terminal: 'vscode',
        });
        expect(result).toEqual('hello 🦫 ');
      });
    });
  });
});
