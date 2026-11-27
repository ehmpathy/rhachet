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
        'each wired event holds its count, in the fixed event order, 0 where none',
        () => {
          expect(asRuleCountsByEvent({ rules })).toEqual([
            { event: 'SessionStart', rules: 2 },
            { event: 'PreToolUse', rules: 3 },
            { event: 'UserPromptSubmit', rules: 0 },
            { event: 'Stop', rules: 1 },
          ]);
        },
      );
    });
  });

  given('[case2] an empty manifest', () => {
    when('[t0] the counts are taken', () => {
      then('every wired event reads 0', () => {
        expect(asRuleCountsByEvent({ rules: [] })).toEqual([
          { event: 'SessionStart', rules: 0 },
          { event: 'PreToolUse', rules: 0 },
          { event: 'UserPromptSubmit', rules: 0 },
          { event: 'Stop', rules: 0 },
        ]);
      });
    });
  });

  given('[case3] no manifest', () => {
    when('[t0] the counts are taken', () => {
      then('there are none, as there is no wire', () => {
        expect(asRuleCountsByEvent({ rules: null })).toEqual([]);
      });
    });
  });
});
