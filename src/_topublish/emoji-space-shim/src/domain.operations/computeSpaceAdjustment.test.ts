import { given, then, when } from 'test-fns';

import { computeSpaceAdjustment } from './computeSpaceAdjustment';

describe('computeSpaceAdjustment', () => {
  given('beaver emoji 🦫', () => {
    when('terminal is vscode', () => {
      then('returns 1', () => {
        expect(
          computeSpaceAdjustment({ emoji: '🦫', terminal: 'vscode' }),
        ).toEqual(1);
      });
    });

    when('terminal is default', () => {
      then('returns 0', () => {
        expect(
          computeSpaceAdjustment({ emoji: '🦫', terminal: 'default' }),
        ).toEqual(0);
      });
    });

    when('terminal is xterm', () => {
      then('falls back to default and returns 0', () => {
        expect(
          computeSpaceAdjustment({ emoji: '🦫', terminal: 'xterm' }),
        ).toEqual(0);
      });
    });
  });

  given('cloud with bolt emoji 🌩️', () => {
    when('terminal is vscode', () => {
      then('returns 1', () => {
        expect(
          computeSpaceAdjustment({ emoji: '🌩️', terminal: 'vscode' }),
        ).toEqual(1);
      });
    });

    when('terminal is default', () => {
      then('returns 1', () => {
        expect(
          computeSpaceAdjustment({ emoji: '🌩️', terminal: 'default' }),
        ).toEqual(1);
      });
    });
  });

  given('unknown emoji 🎉', () => {
    when('terminal is vscode', () => {
      then('returns 0', () => {
        expect(
          computeSpaceAdjustment({ emoji: '🎉', terminal: 'vscode' }),
        ).toEqual(0);
      });
    });

    when('terminal is default', () => {
      then('returns 0', () => {
        expect(
          computeSpaceAdjustment({ emoji: '🎉', terminal: 'default' }),
        ).toEqual(0);
      });
    });
  });

  given('custom registry is provided', () => {
    const customRegistry = {
      '🎉': { vscode: 2, default: 1 },
    };

    when('emoji is in custom registry', () => {
      then('uses custom registry rules', () => {
        expect(
          computeSpaceAdjustment({
            emoji: '🎉',
            terminal: 'vscode',
            registry: customRegistry,
          }),
        ).toEqual(2);
      });
    });
  });
});
