import { given, then, when } from 'test-fns';

import { asMockedBrainCall } from './asMockedBrainCall';

const briefSample = {
  ref: { uri: '.agent/repo=.this/role=tester/briefs/tone.md' },
};

const TEST_CASES = [
  {
    description: 'a string prompt is recorded as is, with each brief uri',
    given: { verb: 'ask' as const, prompt: 'say hello', briefs: [briefSample] },
    expect: {
      verb: 'ask',
      prompt: 'say hello',
      briefs: ['.agent/repo=.this/role=tester/briefs/tone.md'],
    },
  },
  {
    description: 'a tool-execution prompt is recorded as its json',
    given: {
      verb: 'act' as const,
      prompt: [{ exid: 'x1', output: { ok: true } }],
      briefs: [],
    },
    expect: {
      verb: 'act',
      prompt: '[{"exid":"x1","output":{"ok":true}}]',
      briefs: [],
    },
  },
  {
    description: 'absent briefs are recorded as an empty list',
    given: { verb: 'ask' as const, prompt: 'hi', briefs: undefined },
    expect: { verb: 'ask', prompt: 'hi', briefs: [] },
  },
];

describe('asMockedBrainCall', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] asMockedBrainCall is called', () => {
        then('it returns the call record', () => {
          expect(asMockedBrainCall(thisCase.given)).toEqual(thisCase.expect);
        });
      });
    }),
  );
});
