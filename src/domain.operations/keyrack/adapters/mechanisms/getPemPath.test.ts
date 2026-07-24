import { given, then, when } from 'test-fns';

import { homedir } from 'node:os';
import { getPemPath } from './getPemPath';

describe('getPemPath', () => {
  given('[case1] the human answers with a ~ prefix path', () => {
    const question = async (): Promise<string> => '~/keys/app.pem';

    when('[t0] the pem path is read', () => {
      then('it expands the ~ to the home directory', async () => {
        expect(await getPemPath({ question })).toEqual(
          `${homedir()}/keys/app.pem`,
        );
      });
    });
  });

  given(
    '[case2] the human answers with an absolute path and whitespace',
    () => {
      const question = async (): Promise<string> => '  /abs/app.pem  ';

      when('[t0] the pem path is read', () => {
        then('it trims and leaves the absolute path unchanged', async () => {
          expect(await getPemPath({ question })).toEqual('/abs/app.pem');
        });
      });
    },
  );

  given('[case3] the prompt copy the human sees', () => {
    when('[t0] the pem path is read', () => {
      then('the prompt tree output stays locked', async () => {
        // the pre-prompt tree lines are shown to the human; catch any copy drift
        const output: string[] = [];
        const originalLog = console.log;
        console.log = (msg: string) => output.push(msg);
        try {
          await getPemPath({ question: async () => '~/keys/app.pem' });
        } finally {
          console.log = originalLog;
        }
        expect(output.join('\n')).toMatchSnapshot();
      });
    });
  });
});
