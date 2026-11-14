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
    description: 'drops the legacy `.default` negation',
    given: [
      '.agent/.actors/*',
      '!.agent/.actors/actor.via.slug=.default/',
    ].join('\n'),
    expect: '.agent/.actors/*',
  },
  {
    description: 'keeps a human negation of a hash actor — never a repo actor',
    given: ['.agent/.actors/*', '!.agent/.actors/actor.via.hash=abc123/'].join(
      '\n',
    ),
    expect: ['.agent/.actors/*', '!.agent/.actors/actor.via.hash=abc123/'].join(
      '\n',
    ),
  },
  {
    description:
      'keeps a human negation of a derived actor — never a repo actor',
    given: [
      '.agent/.actors/*',
      '!.agent/.actors/actor.via.slug=crew._.delta=1a2b3c4d/',
    ].join('\n'),
    expect: [
      '.agent/.actors/*',
      '!.agent/.actors/actor.via.slug=crew._.delta=1a2b3c4d/',
    ].join('\n'),
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
