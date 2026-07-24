import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { getSelectedApp } from './getSelectedApp';

const appOne = {
  org: 'ehmpathy',
  appId: '123456',
  installationId: '78901234',
  slug: 'ehmpathy-bot',
};

const appTwo = {
  org: 'ehmpathy',
  appId: '654321',
  installationId: '43210987',
  slug: 'ehmpathy-ci',
};

/**
 * .what = run getSelectedApp and capture its guided-tree console output
 * .why = the tree is the primary human-facing surface; capture lets us snapshot it
 */
const withCapturedTree = async (input: {
  candidates: (typeof appOne)[];
  answer: string;
}): Promise<{
  chosen: Awaited<ReturnType<typeof getSelectedApp>>;
  tree: string;
}> => {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => output.push(msg);
  try {
    const chosen = await getSelectedApp({
      candidates: input.candidates,
      question: async () => input.answer,
    });
    return { chosen, tree: output.join('\n') };
  } finally {
    console.log = originalLog;
  }
};

describe('getSelectedApp', () => {
  given('[case1] a single candidate', () => {
    when('[t0] selected', () => {
      then('it auto-selects without a prompt', async () => {
        const { chosen } = await withCapturedTree({
          candidates: [appOne],
          answer: 'unused',
        });
        expect(chosen).toEqual(appOne);
      });

      then('the auto-select tree output stays locked', async () => {
        const { tree } = await withCapturedTree({
          candidates: [appOne],
          answer: 'unused',
        });
        expect(tree).toMatchSnapshot();
      });
    });
  });

  given('[case2] two candidates and a valid choice', () => {
    when('[t0] the human picks the second', () => {
      then('it returns the chosen app', async () => {
        const { chosen } = await withCapturedTree({
          candidates: [appOne, appTwo],
          answer: '2',
        });
        expect(chosen).toEqual(appTwo);
      });

      then('the numbered-choice tree output stays locked', async () => {
        const { tree } = await withCapturedTree({
          candidates: [appOne, appTwo],
          answer: '2',
        });
        expect(tree).toMatchSnapshot();
      });
    });
  });

  given('[case3] two candidates and an invalid choice', () => {
    when('[t0] the human enters an out-of-range number', () => {
      then('it fails loud with a caller-fixable ConstraintError', async () => {
        const error = await getError(() =>
          getSelectedApp({
            candidates: [appOne, appTwo],
            question: async () => '9',
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('invalid app choice');
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
