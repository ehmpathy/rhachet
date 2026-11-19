import { given, then } from 'test-fns';

import { asBootPartition } from './asBootPartition';

const TEST_CASES = [
  {
    description: 'a corpus with no block is all residual',
    given: { corpus: '# boot\n\nride the wave\n' },
    expect: { blocks: [], residual: ['# boot', 'ride the wave'] },
  },
  {
    description:
      'a block and a self-closed ref split from the text around them',
    given: {
      corpus: [
        '# boot',
        '<brief.say path="a.md">',
        'paddle out',
        '</brief.say>',
        'between',
        '  <brief.ref path="b.md"/>',
        'tail',
        '',
      ].join('\n'),
    },
    expect: {
      blocks: [
        {
          key: 'brief.say a.md',
          tag: 'brief.say',
          text: '<brief.say path="a.md">\npaddle out\n</brief.say>',
        },
        {
          key: 'brief.ref b.md',
          tag: 'brief.ref',
          text: '<brief.ref path="b.md"/>',
        },
      ],
      residual: ['# boot', 'between', 'tail'],
    },
  },
  {
    description: 'a tag quoted mid-line is body text, never a block',
    given: {
      corpus: [
        '<brief.say path="a.md">',
        'write `<brief.say path="x">` to boot a brief',
        '</brief.say>',
        '',
      ].join('\n'),
    },
    expect: {
      blocks: [
        {
          key: 'brief.say a.md',
          tag: 'brief.say',
          text: '<brief.say path="a.md">\nwrite `<brief.say path="x">` to boot a brief\n</brief.say>',
        },
      ],
      residual: [],
    },
  },
  {
    description:
      'two blocks of identical text each leave their own place, so no residual leaks',
    given: {
      corpus: [
        'head',
        '<brief.ref path="a.md"/>',
        'mid',
        '<brief.ref path="a.md"/>',
        'foot',
        '',
      ].join('\n'),
    },
    expect: {
      blocks: [
        {
          key: 'brief.ref a.md',
          tag: 'brief.ref',
          text: '<brief.ref path="a.md"/>',
        },
        {
          key: 'brief.ref a.md',
          tag: 'brief.ref',
          text: '<brief.ref path="a.md"/>',
        },
      ],
      residual: ['head', 'mid', 'foot'],
    },
  },
];

describe('asBootPartition', () => {
  given('[case1] each shape of corpus', () => {
    TEST_CASES.map((testCase) =>
      then(testCase.description, () => {
        expect(asBootPartition(testCase.given)).toEqual(testCase.expect);
      }),
    );
  });
});
