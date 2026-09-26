import { given, then, when } from 'test-fns';

import { asActorsGitignoreLine } from './asActorsGitignoreLine';

const TEST_CASES = [
  {
    description: 'the dir form with a final slash',
    given: '.agent/.actors/',
    expect: '.agent/.actors/*',
  },
  {
    description: 'the dir form with no final slash',
    given: '.agent/.actors',
    expect: '.agent/.actors/*',
  },
  {
    description: 'a root-anchored dir form keeps its anchor',
    given: '/.agent/.actors/',
    expect: '/.agent/.actors/*',
  },
  {
    description: 'a root-anchored bare dir form keeps its anchor',
    given: '/.agent/.actors',
    expect: '/.agent/.actors/*',
  },
  {
    description: 'the children form is kept',
    given: '.agent/.actors/*',
    expect: '.agent/.actors/*',
  },
  {
    description: 'a peer ephemeral dir is kept',
    given: '.agent/.cache/',
    expect: '.agent/.cache/',
  },
  {
    description: 'a comment is kept',
    given: '# .agent/.actors/',
    expect: '# .agent/.actors/',
  },
  { description: 'a blank line is kept', given: '', expect: '' },
  {
    description: 'the default-dir negation is kept',
    given: '!.agent/.actors/actor.via.slug=.default/',
    expect: '!.agent/.actors/actor.via.slug=.default/',
  },
];

describe('asActorsGitignoreLine', () => {
  given('[case1] a set of extant gitignore lines', () => {
    TEST_CASES.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then(`it yields ${JSON.stringify(thisCase.expect)}`, () => {
          expect(asActorsGitignoreLine({ line: thisCase.given })).toEqual(
            thisCase.expect,
          );
        });
      }),
    );
  });
});
