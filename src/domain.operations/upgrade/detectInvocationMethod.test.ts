import { given, then, when } from 'test-fns';

import { detectInvocationMethod } from './detectInvocationMethod';

describe('detectInvocationMethod', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  given('[case1] npm_execpath is set', () => {
    when('[t0] detectInvocationMethod is called', () => {
      then('returns npx', () => {
        process.env.npm_execpath =
          '/usr/local/lib/node_modules/npm/bin/npx-cli.js';
        expect(detectInvocationMethod()).toEqual('npx');
      });
    });
  });

  given('[case2] npm_execpath is not set', () => {
    when('[t0] detectInvocationMethod is called', () => {
      then('returns global', () => {
        delete process.env.npm_execpath;
        expect(detectInvocationMethod()).toEqual('global');
      });
    });
  });

  given('[case3] npm_execpath is empty string', () => {
    when('[t0] detectInvocationMethod is called', () => {
      then('returns global', () => {
        process.env.npm_execpath = '';
        expect(detectInvocationMethod()).toEqual('global');
      });
    });
  });
});
