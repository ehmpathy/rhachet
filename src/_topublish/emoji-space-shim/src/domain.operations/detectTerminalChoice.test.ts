import { given, then, when } from 'test-fns';

import { detectTerminalChoice } from './detectTerminalChoice';

describe('detectTerminalChoice', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // reset env before each test
    process.env = { ...originalEnv };
    delete process.env.TERM_PROGRAM;
    delete process.env.TERM;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  given('TERM_PROGRAM is vscode', () => {
    beforeEach(() => {
      process.env.TERM_PROGRAM = 'vscode';
    });

    when('detectTerminalChoice is called', () => {
      then('returns vscode', () => {
        expect(detectTerminalChoice()).toEqual('vscode');
      });
    });
  });

  given('TERM_PROGRAM is gnome-terminal', () => {
    beforeEach(() => {
      process.env.TERM_PROGRAM = 'gnome-terminal';
    });

    when('detectTerminalChoice is called', () => {
      then('returns gnome', () => {
        expect(detectTerminalChoice()).toEqual('gnome');
      });
    });
  });

  given('TERM is xterm-256color', () => {
    beforeEach(() => {
      process.env.TERM = 'xterm-256color';
    });

    when('detectTerminalChoice is called', () => {
      then('returns xterm', () => {
        expect(detectTerminalChoice()).toEqual('xterm');
      });
    });
  });

  given('TERM is xterm', () => {
    beforeEach(() => {
      process.env.TERM = 'xterm';
    });

    when('detectTerminalChoice is called', () => {
      then('returns xterm', () => {
        expect(detectTerminalChoice()).toEqual('xterm');
      });
    });
  });

  given('no relevant env vars are set', () => {
    when('detectTerminalChoice is called', () => {
      then('returns default', () => {
        expect(detectTerminalChoice()).toEqual('default');
      });
    });
  });

  given('TERM_PROGRAM is vscode AND TERM is xterm', () => {
    beforeEach(() => {
      process.env.TERM_PROGRAM = 'vscode';
      process.env.TERM = 'xterm-256color';
    });

    when('detectTerminalChoice is called', () => {
      then('returns vscode (TERM_PROGRAM takes priority)', () => {
        expect(detectTerminalChoice()).toEqual('vscode');
      });
    });
  });
});
