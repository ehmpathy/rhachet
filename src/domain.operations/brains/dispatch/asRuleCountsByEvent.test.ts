import { given, then, when } from 'test-fns';

import { asRuleCountsByEvent } from './asRuleCountsByEvent';

describe('asRuleCountsByEvent', () => {
  given('[case1] rules of three events, interleaved', () => {
    const rules = [
      { event: 'SessionStart' },
      { event: 'PreToolUse' },
      { event: 'PreToolUse' },
      { event: 'Stop' },
      { event: 'PreToolUse' },
      { event: 'SessionStart' },
    ];

    when('[t0] the counts are taken', () => {
      then(
        'each event holds its count, in the order the manifest first names it',
        () => {
          expect(asRuleCountsByEvent({ rules })).toEqual([
            { event: 'SessionStart', rules: 2 },
            { event: 'PreToolUse', rules: 3 },
            { event: 'Stop', rules: 1 },
          ]);
        },
      );
    });
  });

  given('[case2] no rules', () => {
    when('[t0] the counts are taken', () => {
      then('there are none', () => {
        expect(asRuleCountsByEvent({ rules: [] })).toEqual([]);
      });
    });
  });
});
