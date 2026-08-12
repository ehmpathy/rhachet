import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

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
          expect(result.reasons?.[0]).toContain('no value to validate');
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
          expect(result.reasons?.[0]).toContain('sso session expired');
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
            expect(result.reasons?.[0]).toContain('sso session expired');
          }
        });
      },
    );
  });

  given('[case4] cached profile name validation', () => {
    // .note = cached values are now profile names (not JSON credentials)
    // .note = user sets AWS_PROFILE=$(rhx keyrack get ...), AWS SDK resolves creds from profile
    when('[t0] validate called with valid cached profile name', () => {
      const cached = 'myorg-prod';
      const result = mechAdapterAwsSso.validate({ cached });

      then('validation passes', () => {
        expect(result.valid).toBe(true);
      });

      then('does not call aws cli', () => {
        expect(execSyncMock).not.toHaveBeenCalled();
      });
    });

    when('[t1] validate called with profile name that has dots', () => {
      const cached = 'myorg.dev';
      const result = mechAdapterAwsSso.validate({ cached });

      then('validation passes', () => {
        expect(result.valid).toBe(true);
      });
    });

    when(
      '[t2] validate called with invalid profile name (starts with dash)',
      () => {
        const cached = '-invalid-profile';
        const result = mechAdapterAwsSso.validate({ cached });

        then('validation fails', () => {
          expect(result.valid).toBe(false);
        });

        then('reason mentions invalid profile name', () => {
          if (!result.valid) {
            expect(result.reasons?.[0]).toContain(
              'not a valid aws profile name',
            );
          }
        });
      },
    );

    when('[t3] validate called with invalid profile name (has spaces)', () => {
      const result = mechAdapterAwsSso.validate({
        cached: 'profile with spaces',
      });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });

      then('reason mentions invalid profile name', () => {
        if (!result.valid) {
          expect(result.reasons?.[0]).toContain('not a valid aws profile name');
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
          expect(result.reasons?.[0]).toContain('no value to validate');
        }
      });
    });
  });

  /**
   * .what = binds that this adapter refuses a reach, and names the mech the CALLER invoked
   * .why = this adapter object is registered under BOTH `EPHEMERAL_VIA_AWS_SSO` and
   *        `EPHEMERAL_VIA_GITHUB_OIDC` (genContextKeyrackGrantGet), so it cannot name its own
   *        identity — it would be right for one caller and wrong for the other
   * .note = `[t1]` is the clamp that bites. under the defect (a hardcoded mech literal) the
   *         refusal still FIRES, so a test that only asserted "it throws" stays green and
   *         proves none of what matters. only an assertion on WHICH mech the error names
   *         catches it
   * .note = no guided-setup mock is needed: the refusal throws before `setupAwsSsoWithGuide`
   *         is ever reached, which is itself the e13 guarantee (refuse before any side effect)
   */
  given('[case6] one adapter object, two mech identities', () => {
    const reach = { exid: 'github://org=ehmpathy' };

    when('[t0] invoked as EPHEMERAL_VIA_AWS_SSO with a reach', () => {
      then('it refuses, and names aws sso', async () => {
        const error = await getError(
          mechAdapterAwsSso.acquireForSet({
            keySlug: 'ehmpathy.prep.AWS_PROFILE',
            reach,
            mech: 'EPHEMERAL_VIA_AWS_SSO',
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('EPHEMERAL_VIA_AWS_SSO');
      });
    });

    when('[t1] invoked as EPHEMERAL_VIA_GITHUB_OIDC with a reach', () => {
      then(
        'it refuses, and names OIDC — never the adapter it shares',
        async () => {
          const error = await getError(
            mechAdapterAwsSso.acquireForSet({
              keySlug: 'ehmpathy.prep.AWS_PROFILE',
              reach,
              mech: 'EPHEMERAL_VIA_GITHUB_OIDC',
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);

          // THE clamp: under a hardcoded literal this reads EPHEMERAL_VIA_AWS_SSO, and a
          // human debugs the wrong mechanism entirely
          expect(error.message).toContain('EPHEMERAL_VIA_GITHUB_OIDC');
          expect(error.message).not.toContain('EPHEMERAL_VIA_AWS_SSO');
        },
      );
    });
  });
});
