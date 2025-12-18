import { BadRequestError } from 'helpful-errors';

import { getPeerQualifiersOfOutputChoice } from './getPeerQualifiersOfOutputChoice';

const validCases: {
  peers: string[];
  output: ReturnType<typeof getPeerQualifiersOfOutputChoice>;
}[] = [
  {
    peers: [
      'provider.scene_6.loyalty_build.v1i2.[stories]._.md',
      'provider.scene_6.loyalty_build.v1i2.[stories].v1._.md',
      'provider.scene_6.loyalty_build.v1i2.[stories].v1.md',
      'provider.scene_6.loyalty_build.v1i2.[stories].v1.i1.md',
      'provider.scene_6.loyalty_build.v1i2.[stories].v1.i2.md',
      'provider.scene_6.loyalty_build.v1i2.[stories].v1.i3.md',
      'provider.scene_6.loyalty_build.v1i2.[stories].choice.v1.i3.md',
      'provider.scene_6.loyalty_build.v1i2.[stories].choice.i5.md',
    ],
    output: {
      prefix: 'provider.scene_6.loyalty_build.v1i2.[stories]',
      extension: 'md',
    },
  },
  {
    peers: [
      'provider.scene_6.loyalty_build.v1i2.[stories].src',
      'provider.scene_6.loyalty_build.v1i2.[stories].v1.src',
    ],
    output: {
      prefix: 'provider.scene_6.loyalty_build.v1i2.[stories]',
      extension: 'src',
    },
  },
  {
    peers: [
      'provider.scene_6.loyalty_build.v2i5.[notes].i1.txt',
      'provider.scene_6.loyalty_build.v2i5.[notes].i2.txt',
    ],
    output: {
      prefix: 'provider.scene_6.loyalty_build.v2i5.[notes]',
      extension: 'txt',
    },
  },
  {
    peers: [
      'provider.scene_6.loyalty_build.v1i0.[draft]._.md',
      'provider.scene_6.loyalty_build.v1i0.[draft].i1.md',
    ],
    output: {
      prefix: 'provider.scene_6.loyalty_build.v1i0.[draft]',
      extension: 'md',
    },
  },
];

describe('getPeerQualifiersOfOutputChoice', () => {
  validCases.forEach(({ peers, output }) => {
    describe(`peers ${output.prefix}`, () => {
      peers.forEach((choice) => {
        test(`returns correct prefix and extension for choice "${choice}"`, () => {
          expect(getPeerQualifiersOfOutputChoice(choice)).toEqual(output);
        });
      });
    });
  });

  const invalidCases: string[] = [
    // 'provider.scene_6.loyalty_build.v1i2.[stories]', // no extension
    // 'provider.scene_6.loyalty_build.v1i2.[stories]', // no extension
    // 'just_something_random', // completely malformed
    // 'file.without.any.structure', // another malformed
  ];

  describe('invalid input cases', () => {
    invalidCases.forEach((input) => {
      test(`throws BadRequestError for "${input}"`, () => {
        expect(() => getPeerQualifiersOfOutputChoice(input)).toThrow(
          BadRequestError,
        );
      });
    });
  });
});
