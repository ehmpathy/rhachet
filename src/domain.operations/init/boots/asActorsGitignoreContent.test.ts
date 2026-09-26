import { given, then, when } from 'test-fns';

import { asActorsGitignoreContent } from './asActorsGitignoreContent';

const TEST_CASES = [
  {
    description: 'the dir form among other lines becomes the children form',
    given: 'node_modules/\n.agent/.actors/\ndist/\n',
    expect: 'node_modules/\n.agent/.actors/*\ndist/\n',
  },
  {
    description: 'a file with no `.actors` line comes back byte for byte',
    given: 'node_modules/\n# a comment\n\ndist/',
    expect: 'node_modules/\n# a comment\n\ndist/',
  },
  {
    description: 'the children form and the negation are kept',
    given: '.agent/.actors/*\n!.agent/.actors/actor.via.slug=.default/\n',
    expect: '.agent/.actors/*\n!.agent/.actors/actor.via.slug=.default/\n',
  },
  { description: 'an empty file stays empty', given: '', expect: '' },
];

describe('asActorsGitignoreContent', () => {
  given('[case1] a set of extant gitignore contents', () => {
    TEST_CASES.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then(`it yields ${JSON.stringify(thisCase.expect)}`, () => {
          expect(asActorsGitignoreContent({ content: thisCase.given })).toEqual(
            thisCase.expect,
          );
        });
      }),
    );
  });
});
