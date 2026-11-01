import { given, then, useBeforeAll, when } from 'test-fns';

import { asBrainAuthApiBilledLine } from './asBrainAuthApiBilledLine';

describe('asBrainAuthApiBilledLine', () => {
  given('[case1] a spawn env with no ANTHROPIC_API_KEY', () => {
    when('[t0] the notice is rendered', () => {
      then('it says naught', () => {
        expect(
          asBrainAuthApiBilledLine({
            env: { CLAUDE_CODE_OAUTH_TOKEN: 'sk-ant-oat-fake' },
            isBrainAuthAbsent: false,
          }),
        ).toEqual(null);
      });
    });
  });

  given('[case2] a spawn env with an empty ANTHROPIC_API_KEY', () => {
    when('[t0] the notice is rendered', () => {
      then('it says naught, since claude code ignores an empty key', () => {
        expect(
          asBrainAuthApiBilledLine({
            env: { ANTHROPIC_API_KEY: '' },
            isBrainAuthAbsent: false,
          }),
        ).toEqual(null);
      });
    });
  });

  given('[case3] a spawn env with ANTHROPIC_API_KEY set', () => {
    when('[t0] the notice is rendered', () => {
      // .note = useBeforeAll hands back a proxy over a Record, so the line rides a field
      const result = useBeforeAll(async () => ({
        line: asBrainAuthApiBilledLine({
          env: { ANTHROPIC_API_KEY: 'sk-ant-api-fake' },
          isBrainAuthAbsent: false,
        }),
      }));

      then('it names the api charge', () => {
        expect(result.line).toContain('bills the anthropic api');
        expect(result.line).toMatchSnapshot();
      });

      then('it names the fix', () => {
        expect(result.line).toContain('unset ANTHROPIC_API_KEY');
      });

      then('it never prints the key value', () => {
        expect(result.line).not.toContain('sk-ant-api-fake');
      });
    });
  });

  given(
    '[case4] a spawn env with ANTHROPIC_AUTH_TOKEN set, and no api key',
    () => {
      when('[t0] the notice is rendered', () => {
        const result = useBeforeAll(async () => ({
          line: asBrainAuthApiBilledLine({
            env: { ANTHROPIC_AUTH_TOKEN: 'sk-ant-auth-fake' },
            isBrainAuthAbsent: false,
          }),
        }));

        then(
          'it names the auth token, which bills the api the same way',
          () => {
            expect(result.line).toContain('since ANTHROPIC_AUTH_TOKEN is set');
            expect(result.line).toMatchSnapshot();
          },
        );

        then('it names the fix', () => {
          expect(result.line).toContain('unset ANTHROPIC_AUTH_TOKEN');
        });

        then('it never prints the token value', () => {
          expect(result.line).not.toContain('sk-ant-auth-fake');
        });
      });
    },
  );

  given('[case5] a spawn env with both keys set', () => {
    when('[t0] the notice is rendered', () => {
      const result = useBeforeAll(async () => ({
        line: asBrainAuthApiBilledLine({
          env: {
            ANTHROPIC_API_KEY: 'sk-ant-api-fake',
            ANTHROPIC_AUTH_TOKEN: 'sk-ant-auth-fake',
          },
          isBrainAuthAbsent: false,
        }),
      }));

      then('it names both keys', () => {
        expect(result.line).toContain(
          'since ANTHROPIC_API_KEY and ANTHROPIC_AUTH_TOKEN are set',
        );
        expect(result.line).toMatchSnapshot();
      });

      then(
        'it names an unset of both, which leaves the clone on the subscription',
        () => {
          expect(result.line).toContain(
            'unset ANTHROPIC_API_KEY and ANTHROPIC_AUTH_TOKEN, then enroll again',
          );
        },
      );

      then('it never prints a key value', () => {
        expect(result.line).not.toContain('fake');
      });
    });
  });

  given(
    '[case6] a spawn env with ANTHROPIC_API_KEY set, on a seat with no login',
    () => {
      when('[t0] the notice is rendered', () => {
        const result = useBeforeAll(async () => ({
          line: asBrainAuthApiBilledLine({
            env: { ANTHROPIC_API_KEY: 'sk-ant-api-fake' },
            isBrainAuthAbsent: true,
          }),
        }));

        then('it says the seat has no /login to fall back on', () => {
          expect(result.line).toContain('this seat has no /login');
          expect(result.line).toMatchSnapshot();
        });

        then('its fix names a subscription credential beside the unset', () => {
          expect(result.line).toContain(
            'unset ANTHROPIC_API_KEY, then /login or set CLAUDE_CODE_OAUTH_TOKEN',
          );
        });

        then('it never prints the key value', () => {
          expect(result.line).not.toContain('sk-ant-api-fake');
        });
      });
    },
  );
});
