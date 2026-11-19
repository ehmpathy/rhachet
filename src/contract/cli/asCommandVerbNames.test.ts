import { Command } from 'commander';

import { asCommandVerbNames } from './asCommandVerbNames';

describe('asCommandVerbNames', () => {
  test('the verbs a group registers, in registration order', () => {
    const clone = new Command('clone');
    clone.command('list');
    clone.command('say');
    clone.command('prune');
    expect(asCommandVerbNames({ command: clone })).toEqual([
      'list',
      'say',
      'prune',
    ]);
  });

  test('a group with no verbs yields none', () => {
    expect(asCommandVerbNames({ command: new Command('clone') })).toEqual([]);
  });
});
