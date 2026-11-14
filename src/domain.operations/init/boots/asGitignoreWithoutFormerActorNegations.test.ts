import { asGitignoreWithoutFormerActorNegations } from './asGitignoreWithoutFormerActorNegations';

const NEGATION = '!.agent/.actors/actor.via.slug=builder/';

const CASES = [
  {
    description: 'drops a former repo actor negation, keeps the current one',
    given: [
      '.agent/.actors/*',
      '!.agent/.actors/actor.via.repo=ambient/',
      NEGATION,
    ].join('\n'),
    expect: ['.agent/.actors/*', NEGATION].join('\n'),
  },
  {
    description: 'drops a prior ambient slug negation',
    given: ['.agent/.actors/*', '!.agent/.actors/actor.via.slug=scholar/'].join(
      '\n',
    ),
    expect: '.agent/.actors/*',
  },
  {
    description: 'leaves every other line untouched',
    given: ['node_modules', '!keep/me/', '.agent/.actors/*'].join('\n'),
    expect: ['node_modules', '!keep/me/', '.agent/.actors/*'].join('\n'),
  },
  {
    description:
      'a negation of a path deeper than an actor dir is not an actor-dir negation',
    given: '!.agent/.actors/actor.via.slug=scholar/brain/',
    expect: '!.agent/.actors/actor.via.slug=scholar/brain/',
  },
];

describe('asGitignoreWithoutFormerActorNegations', () => {
  CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(
        asGitignoreWithoutFormerActorNegations({
          content: thisCase.given,
          negation: NEGATION,
        }),
      ).toEqual(thisCase.expect);
    }),
  );
});
