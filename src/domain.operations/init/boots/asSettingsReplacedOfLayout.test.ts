import { given, then, when } from 'test-fns';

import type { BrainDirSettingsLayout } from '@src/domain.operations/actor/enrolled/setBrainDirSettingsLayout';

import { asSettingsReplacedOfLayout } from './asSettingsReplacedOfLayout';

/**
 * .what = one layout result with the given effects
 */
const genLayout = (input: {
  effects: BrainDirSettingsLayout['effects'];
}): BrainDirSettingsLayout => ({
  effects: input.effects,
  grove: { source: '/home/human/.claude/settings.json', isPresent: true },
});

const TEST_CASES: {
  description: string;
  given: { settings: BrainDirSettingsLayout | null };
  expect: { output: ReturnType<typeof asSettingsReplacedOfLayout> };
}[] = [
  {
    description: 'a step that faulted names naught',
    given: { settings: null },
    expect: { output: [] },
  },
  {
    description: 'a real file replaced by its arrow is named, with the target',
    given: {
      settings: genLayout({
        effects: [
          {
            kind: 'REPLACED',
            name: 'settings.local.json',
            target: 'settings.of.repo.json',
          },
        ],
      }),
    },
    expect: {
      output: [
        { name: 'settings.local.json', target: 'settings.of.repo.json' },
      ],
    },
  },
  {
    description: 'a LINKED effect is never named — a fresh arrow lost no file',
    given: {
      settings: genLayout({
        effects: [
          {
            kind: 'LINKED',
            name: 'settings.local.json',
            target: 'settings.of.repo.json',
          },
        ],
      }),
    },
    expect: { output: [] },
  },
  {
    description:
      'a real file removed on a box with no grove is named, with no arrow target; a dropped arrow is not',
    given: {
      settings: genLayout({
        effects: [
          { kind: 'REMOVED', name: 'settings.json', reason: 'grove absent' },
          {
            kind: 'UNLINKED',
            name: 'settings.of.grove.json',
            reason: 'grove absent',
          },
        ],
      }),
    },
    expect: { output: [{ name: 'settings.json', target: null }] },
  },
];

describe('asSettingsReplacedOfLayout', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the replaced names are read from the layout', () => {
        then('they are exactly the expected names and targets', () => {
          expect(asSettingsReplacedOfLayout(thisCase.given)).toEqual(
            thisCase.expect.output,
          );
        });
      });
    }),
  );
});
