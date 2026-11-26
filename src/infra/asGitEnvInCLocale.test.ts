import { given, then, when } from 'test-fns';

import { asGitEnvInCLocale } from './asGitEnvInCLocale';

describe('asGitEnvInCLocale', () => {
  given('[case1] an env under a non-english locale', () => {
    const env = {
      PATH: '/usr/bin',
      LANG: 'de_DE.UTF-8',
      LC_ALL: 'de_DE.UTF-8',
    };

    when('[t0] the git env is built', () => {
      // .note.teeth = drop `LC_ALL: 'C'` from asGitEnvInCLocale and this goes red: git would
      //   then print `kein Git-Repository`, and delGitIndexPaths would fail loud outside a repo
      then('LC_ALL is C, which outranks LANG for git messages', () => {
        expect(asGitEnvInCLocale({ env }).LC_ALL).toEqual('C');
      });

      then('every other var is kept', () => {
        expect(asGitEnvInCLocale({ env })).toEqual({
          PATH: '/usr/bin',
          LANG: 'de_DE.UTF-8',
          LC_ALL: 'C',
        });
      });

      then('the input env is not mutated', () => {
        asGitEnvInCLocale({ env });
        expect(env.LC_ALL).toEqual('de_DE.UTF-8');
      });
    });
  });
});
