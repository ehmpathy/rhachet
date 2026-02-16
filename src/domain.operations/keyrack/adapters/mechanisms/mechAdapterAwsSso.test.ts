import { given, then, when } from 'test-fns';

// mock child_process.execSync before import
jest.mock('node:child_process', () => {
  const originalModule = jest.requireActual('node:child_process');
  return {
    ...originalModule,
    execSync: jest.fn(() => Buffer.from('{}')),
  };
});

import { execSync } from 'node:child_process';
import { mechAdapterAwsSso } from './mechAdapterAwsSso';

const execSyncMock = execSync as jest.MockedFunction<typeof execSync>;

describe('mechAdapterAwsSso', () => {
  beforeEach(() => {
    execSyncMock.mockClear();
    // default: sts get-caller-identity succeeds
    execSyncMock.mockReturnValue(Buffer.from('{}'));
  });

  given('[case1] valid aws profile names with valid session', () => {
    when('[t0] validate called with simple profile name', () => {
      const result = mechAdapterAwsSso.validate({ source: 'myprofile' });

      then('validation passes', () => {
        expect(result.valid).toBe(true);
      });
    });

    when('[t1] validate called with profile name that has dots', () => {
      const result = mechAdapterAwsSso.validate({ source: 'org-name.dev' });

      then('validation passes', () => {
        expect(result.valid).toBe(true);
      });
    });

    when('[t2] validate called with profile name that has dashes', () => {
      const result = mechAdapterAwsSso.validate({ source: 'my-org-name-prod' });

      then('validation passes', () => {
        expect(result.valid).toBe(true);
      });
    });

    when('[t3] validate called with profile name that has underscores', () => {
      const result = mechAdapterAwsSso.validate({ source: 'my_org_name_prod' });

      then('validation passes', () => {
        expect(result.valid).toBe(true);
      });
    });

    when('[t4] validate called with mixed format profile name', () => {
      const result = mechAdapterAwsSso.validate({
        source: 'AcmeInc_Production.Admin-Role',
      });

      then('validation passes', () => {
        expect(result.valid).toBe(true);
      });
    });
  });

  given('[case2] invalid aws profile name formats', () => {
    when('[t0] validate called with empty string', () => {
      const result = mechAdapterAwsSso.validate({ source: '' });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });

      then('reason mentions no value', () => {
        if (!result.valid) {
          expect(result.reason).toContain('no value to validate');
        }
      });

      then('does not call aws cli', () => {
        expect(execSyncMock).not.toHaveBeenCalled();
      });
    });

    when('[t1] validate called with profile name that starts with dash', () => {
      const result = mechAdapterAwsSso.validate({ source: '-invalid' });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });

      then('does not call aws cli', () => {
        expect(execSyncMock).not.toHaveBeenCalled();
      });
    });

    when('[t2] validate called with profile name that starts with dot', () => {
      const result = mechAdapterAwsSso.validate({ source: '.invalid' });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });
    });

    when('[t3] validate called with profile name that has spaces', () => {
      const result = mechAdapterAwsSso.validate({ source: 'invalid profile' });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });
    });

    when(
      '[t4] validate called with profile name that has special chars',
      () => {
        const result = mechAdapterAwsSso.validate({
          source: 'invalid@profile!',
        });

        then('validation fails', () => {
          expect(result.valid).toBe(false);
        });
      },
    );
  });

  given('[case3] sso session validation', () => {
    when('[t0] validate called with valid profile and valid session', () => {
      execSyncMock.mockReturnValue(Buffer.from('{"Account":"123456789012"}'));
      const result = mechAdapterAwsSso.validate({ source: 'acme-prod' });

      then('validation passes', () => {
        expect(result.valid).toBe(true);
      });
    });

    when('[t1] validate called with valid profile but expired session', () => {
      execSyncMock.mockImplementation(() => {
        throw new Error('SSO session expired');
      });
      const result = mechAdapterAwsSso.validate({ source: 'acme-prod' });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });

      then('reason mentions session expired', () => {
        if (!result.valid) {
          expect(result.reason).toContain('sso session expired');
        }
      });
    });

    when(
      '[t2] validate called with valid profile but profile not found',
      () => {
        execSyncMock.mockImplementation(() => {
          throw new Error(
            'The config profile (bad-profile) could not be found',
          );
        });
        const result = mechAdapterAwsSso.validate({ source: 'bad-profile' });

        then('validation fails', () => {
          expect(result.valid).toBe(false);
        });

        then('reason mentions session expired', () => {
          if (!result.valid) {
            expect(result.reason).toContain('sso session expired');
          }
        });
      },
    );
  });

  given('[case4] cached credentials validation', () => {
    when('[t0] validate called with valid cached credentials', () => {
      const cached = JSON.stringify({
        AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
        AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        AWS_SESSION_TOKEN: 'token123',
      });
      const result = mechAdapterAwsSso.validate({ cached });

      then('validation passes', () => {
        expect(result.valid).toBe(true);
      });

      then('does not call aws cli', () => {
        expect(execSyncMock).not.toHaveBeenCalled();
      });
    });

    when(
      '[t1] validate called with cached credentials that lack access key',
      () => {
        const cached = JSON.stringify({
          AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        });
        const result = mechAdapterAwsSso.validate({ cached });

        then('validation fails', () => {
          expect(result.valid).toBe(false);
        });

        then('reason mentions lack access key', () => {
          if (!result.valid) {
            expect(result.reason).toContain('AWS_ACCESS_KEY_ID');
          }
        });
      },
    );

    when(
      '[t2] validate called with cached credentials that lack secret key',
      () => {
        const cached = JSON.stringify({
          AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
        });
        const result = mechAdapterAwsSso.validate({ cached });

        then('validation fails', () => {
          expect(result.valid).toBe(false);
        });

        then('reason mentions lack secret key', () => {
          if (!result.valid) {
            expect(result.reason).toContain('AWS_SECRET_ACCESS_KEY');
          }
        });
      },
    );

    when('[t3] validate called with invalid json', () => {
      const result = mechAdapterAwsSso.validate({ cached: 'not-json' });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });

      then('reason mentions invalid json', () => {
        if (!result.valid) {
          expect(result.reason).toContain('not valid json');
        }
      });
    });
  });

  given('[case5] no value provided', () => {
    when('[t0] validate called with empty input', () => {
      const result = mechAdapterAwsSso.validate({});

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });

      then('reason mentions no value', () => {
        if (!result.valid) {
          expect(result.reason).toContain('no value to validate');
        }
      });
    });
  });
});
